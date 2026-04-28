import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4, v4 } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	sendBuyerOrderConfirmationEmail,
	sendSellerOrderNotificationEmail,
	sendSubscriptionConfirmationEmail,
	sendSubscriptionPaymentFailedEmail,
	sendSubscriptionExpiredEmail,
	sendSepaOrderReceivedEmail,
	sendSepaPaymentConfirmedEmail,
	sendSepaPaymentFailedEmail,
	sendAdminAlertEmail,
	sendDisputeAlertEmail,
} from '../services/emailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new DbHelper();
const checkoutRouter = express.Router();
const stripe = new Stripe(process.env.SK_TEST);

// ─────────────────────────────────────────────────────────────
// FEE CALCULATIONS (all amounts in cents)
// ─────────────────────────────────────────────────────────────

// Stripe card: 1.5% + €0.25 (covers EU cards + small buffer)
const STRIPE_RATE  = 0.015;
const STRIPE_FIXED = 25; // €0.25 in cents

// SEPA Direct Debit via Stripe: 0.8%, capped at €5.00
const SEPA_RATE = 0.008;
const SEPA_CAP  = 500; // €5.00 in cents

// PayPal: 3.49% + €0.49 (standard European merchant rate)
const PAYPAL_RATE  = 0.0349;
const PAYPAL_FIXED = 49; // €0.49 in cents

function calcFeeCents(subtotalCents, method) {
	if (method === 'sepa') {
		return Math.min(Math.ceil(subtotalCents * SEPA_RATE), SEPA_CAP);
	}
	if (method === 'paypal') {
		return Math.ceil(subtotalCents * PAYPAL_RATE + PAYPAL_FIXED);
	}
	// default: card (Stripe)
	return Math.ceil((subtotalCents + STRIPE_FIXED) / (1 - STRIPE_RATE) - subtotalCents);
}

// ─────────────────────────────────────────────────────────────
// PAYPAL REST API HELPERS
// ─────────────────────────────────────────────────────────────

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
	? 'https://api-m.paypal.com'
	: 'https://api-m.sandbox.paypal.com';

async function getPaypalToken() {
	const creds = Buffer.from(
		`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
	).toString('base64');

	const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${creds}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(`PayPal auth failed: ${err.error_description || res.status}`);
	}

	const data = await res.json();
	return data.access_token;
}

async function createPaypalOrder(totalEur, description, draftId) {
	const token = await getPaypalToken();
	const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			intent: 'CAPTURE',
			purchase_units: [{
				amount: { currency_code: 'EUR', value: totalEur.toFixed(2) },
				description,
			}],
			application_context: {
				brand_name: 'Gibli Marketplace',
				landing_page: 'NO_PREFERENCE',
				user_action: 'PAY_NOW',
				return_url: `${process.env.FRONTEND_URL}/payment/success?paypal=true&draftId=${encodeURIComponent(draftId)}`,
				cancel_url: `${process.env.FRONTEND_URL}/payment/fail`,
			},
		}),
	});

	const data = await res.json();
	if (!res.ok) throw new Error(`PayPal order creation failed: ${data.message || res.status}`);
	return data;
}

async function capturePaypalOrder(paypalOrderId) {
	const token = await getPaypalToken();
	const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	const data = await res.json();
	if (!res.ok) throw new Error(`PayPal capture failed: ${data.message || res.status}`);
	return data;
}

// ─────────────────────────────────────────────────────────────
// ADDRESS HELPERS
// ─────────────────────────────────────────────────────────────

const parseShippingAddress = (shippingAddress) => {
	if (shippingAddress && shippingAddress.default) {
		return { defaultAddress: shippingAddress.default, perItem: shippingAddress.perItem || {} };
	}
	return { defaultAddress: shippingAddress, perItem: {} };
};

const getAddressForItem = (item, defaultAddress, perItem) => {
	if (perItem[item.ProductId]) return perItem[item.ProductId];
	return defaultAddress;
};

// ─────────────────────────────────────────────────────────────
// SHARED ORDER FULFILMENT (used by Stripe webhook + PayPal capture + activate-session)
//
// The draft is marked as used BEFORE the order creation loop so that
// webhook retries cannot create duplicate orders. Email failures are
// isolated with individual try-catch blocks so they never abort
// fulfillment after payment has been received.
// ─────────────────────────────────────────────────────────────

async function fulfillOrder({ draftId, paymentId, deliveryStatus = 'Processing', preClaimedDraft = null }) {
	let draftRow = preClaimedDraft;

	if (!draftRow) {
		// Atomic claim: UPDATE WHERE IsUsed=0 + SELECT in one SP.
		// Only one concurrent caller gets the draft row back — the other gets an empty
		// recordset and returns early. This eliminates the webhook vs activate-session race.
		const claimResult = await db.executeProcedure('ClaimCheckoutDraft', { DraftId: draftId });
		draftRow = claimResult?.recordset?.[0];

		if (!draftRow) {
			// Either already claimed by a concurrent call, or draft doesn't exist.
			// Check orders by PI to distinguish "race lost" from "genuine missing draft".
			if (paymentId) {
				const existing = await db.executeProcedure('GetOrdersByPaymentIntentId', {
					PaymentIntentId: paymentId,
					StatusFilter:    null,
				});
				if (existing.recordset?.length > 0) {
					console.log(`ℹ️ fulfillOrder: draft ${draftId} already claimed — orders exist for PI ${paymentId}`);
					return;
				}
			}
			throw new Error(`No checkout draft found for ID: ${draftId}`);
		}
	}

	const isAwaitingPayment  = deliveryStatus === 'AwaitingPayment';
	const buyerId            = draftRow.BuyerId;
	const cartItems          = JSON.parse(draftRow.CartItemsJson);
	const shippingOptions    = JSON.parse(draftRow.ShippingOptionsJson);
	const shippingAddressRaw = JSON.parse(draftRow.ShippingAddressJson);
	const { defaultAddress, perItem } = parseShippingAddress(shippingAddressRaw);

	// Re-validate stock at fulfillment time to catch concurrent purchases
	for (const item of cartItems) {
		const stockCheck = await db.executeProcedure('GetProductForCheckout', {
			ProductId: item.ProductId,
			UserId:    buyerId,
			Quantity:  item.Quantity,
		});
		const stock = stockCheck.recordset?.[0];
		if (!stock || stock.InStock < item.Quantity) {
			throw new Error(`Insufficient stock for product ${item.ProductId} at time of fulfillment`);
		}
	}

	const groupKey = (item) => {
		const addr = getAddressForItem(item, defaultAddress, perItem);
		return `${item.SellerId}__${addr?.ShippingId || 'default'}`;
	};

	const grouped = cartItems.reduce((acc, item) => {
		const key = groupKey(item);
		if (!acc[key]) acc[key] = [];
		acc[key].push(item);
		return acc;
	}, {});

	for (const items of Object.values(grouped)) {
		const sellerId        = items[0].SellerId;
		const orderAddress    = getAddressForItem(items[0], defaultAddress, perItem);
		const orderShippingId = orderAddress?.ShippingId;

		const sellerOrderTotal = items.reduce((sum, i) => {
			const shipType   = shippingOptions?.[i.ProductId] || 'standard';
			const totalPrice = shipType === 'express' ? (i.ExpressTotalPrice || i.TotalPrice) : i.TotalPrice;
			return sum + totalPrice;
		}, 0);

		// Embed ShippingType in each item so payment_intent.succeeded can rebuild shippingOptions
		const enrichedItems = items.map((i) => ({
			...i,
			ShippingType: shippingOptions?.[i.ProductId] || 'standard',
		}));

		const newOrderId = uuidv4();
		await db.executeProcedure('CreateOrder', {
			OrderId:         newOrderId,
			BuyerId:         buyerId,
			SellerId:        sellerId,
			ShippingId:      orderShippingId,
			TotalAmount:     sellerOrderTotal,
			PaymentIntentId: paymentId,
			DeliveryStatus:  deliveryStatus,
			CartItemsJson:   JSON.stringify(enrichedItems),
		});

		// Commission + seller notification are deferred for SEPA — triggered by payment_intent.succeeded
		if (!isAwaitingPayment) {
			try {
				const commResult      = await db.executeProcedure('GetSellerCommissionRate', { SellerId: sellerId });
				const commissionRate  = commResult.recordset?.[0]?.CommissionRate ?? 0.05;
				const subscriptionId  = commResult.recordset?.[0]?.SubscriptionId ?? null;
				const commissionAmount = Number((sellerOrderTotal * commissionRate).toFixed(2));
				const netAmount        = Number((sellerOrderTotal - commissionAmount).toFixed(2));

				await db.executeProcedure('RecordCommission', {
					OrderId:          newOrderId,
					SellerId:         sellerId,
					SubscriptionId:   subscriptionId,
					GrossAmount:      sellerOrderTotal,
					CommissionRate:   commissionRate,
					CommissionAmount: commissionAmount,
					NetAmount:        netAmount,
				});
			} catch (commErr) {
				console.error('⚠️ Failed to record commission for order', newOrderId, commErr.message);
			}

			try {
				const seller = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
				await sendSellerOrderNotificationEmail(
					seller.recordset[0].Email,
					seller.recordset[0].BusinessName,
					enrichedItems,
					shippingOptions,
					orderAddress,
					sellerOrderTotal
				);
			} catch (emailErr) {
				console.error('⚠️ Failed to send seller notification email for order', newOrderId, emailErr.message);
			}
		}
	}

	await db.executeProcedure('ClearUserCart', { UserId: buyerId });

	try {
		const buyer = await db.executeProcedure('GetUserById', { UserId: buyerId });
		if (isAwaitingPayment) {
			await sendSepaOrderReceivedEmail(
				buyer.recordset[0].Email,
				buyer.recordset[0].Username,
				cartItems,
				draftRow.TotalAmount,
				shippingOptions
			);
		} else {
			await sendBuyerOrderConfirmationEmail(
				buyer.recordset[0].Email,
				buyer.recordset[0].Username,
				cartItems,
				draftRow.TotalAmount,
				shippingOptions
			);
		}
	} catch (emailErr) {
		console.error('⚠️ Failed to send buyer email:', emailErr.message);
	}
}

// ─────────────────────────────────────────────────────────────
// STRIPE: Build line items from a draft
// ─────────────────────────────────────────────────────────────

function buildStripeLineItems(cartItems, shippingOptions, method) {
	const lineItems = cartItems.map((item) => {
		const shipType    = shippingOptions[item.ProductId];
		const shippingFee = shipType === 'express' ? item.ExpressShippingPrice : item.ShippingPrice;
		const totalPrice  = shipType === 'express' ? item.ExpressTotalPrice    : item.TotalPrice;

		const descParts = [];
		if (item.SellerName) descParts.push(`Sold by: ${item.SellerName}`);
		descParts.push(`${shipType === 'express' ? 'Express' : 'Standard'} shipping: €${Number(shippingFee).toFixed(2)}`);
		descParts.push(`Unit price: €${Number(item.Price).toFixed(2)}`);

		return {
			price_data: {
				currency: 'eur',
				product_data: {
					name: item.ProductName,
					description: descParts.join(' · '),
					images: item.ProductImageUrl ? [item.ProductImageUrl] : [],
				},
				unit_amount: Math.round(totalPrice * 100),
			},
			quantity: item.Quantity,
		};
	});

	const subtotalCents = lineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
	const feeCents      = calcFeeCents(subtotalCents, method);

	const feeLabel = method === 'sepa'
		? 'Payment processing fee (SEPA Direct Debit)'
		: 'Payment processing fee (Stripe card)';

	return [
		...lineItems,
		{
			price_data: {
				currency: 'eur',
				product_data: { name: feeLabel },
				unit_amount: feeCents,
			},
			quantity: 1,
		},
	];
}

// ─────────────────────────────────────────────────────────────
// POST /checkout/create-session  (Stripe — card or SEPA)
// Body: { draftId, paymentMethod: 'card' | 'sepa' }
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/create-session', authenticateToken, async (req, res) => {
	const { draftId, paymentMethod = 'card' } = req.body;

	try {
		const result = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
		const draft  = result.recordset?.[0];
		if (!draft) return res.status(404).json({ message: 'Checkout draft not found.' });

		if (String(draft.BuyerId) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Forbidden.' });
		}
		if (draft.SessionId) {
			return res.status(409).json({ message: 'A payment session is already in progress for this order. Please go back and start a new checkout.' });
		}

		const cartItems          = JSON.parse(draft.CartItemsJson);
		const shippingOptions    = JSON.parse(draft.ShippingOptionsJson);
		const shippingAddressRaw = JSON.parse(draft.ShippingAddressJson);
		const { defaultAddress } = parseShippingAddress(shippingAddressRaw);

		if (!cartItems?.length || !shippingOptions || !defaultAddress) {
			return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
		}

		const lineItemsWithFee = buildStripeLineItems(cartItems, shippingOptions, paymentMethod);
		const paymentMethods   = paymentMethod === 'sepa' ? ['sepa_debit'] : ['card'];

		const session = await stripe.checkout.sessions.create({
			payment_method_types: paymentMethods,
			mode: 'payment',
			line_items: lineItemsWithFee,
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url:  `${process.env.FRONTEND_URL}/payment/fail`,
			metadata: {
				userId:            String(req.user.id),
				checkoutDraftId:   draftId,
				shippingAddressId: String(defaultAddress.ShippingId),
				paymentMethod,
			},
		});

		await db.executeProcedure('InsertSessionIdToDraft', { DraftId: draftId, SessionId: session.id });
		return res.json({ url: session.url });
	} catch (err) {
		console.error('Error creating checkout session:', err);
		res.status(500).json({ message: 'Failed to create checkout session.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/create-paypal-order
// Body: { draftId }
// Returns: { paypalOrderId }
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/create-paypal-order', authenticateToken, async (req, res) => {
	const { draftId } = req.body;

	try {
		const result = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
		const draft  = result.recordset?.[0];
		if (!draft) return res.status(404).json({ message: 'Checkout draft not found.' });

		if (String(draft.BuyerId) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Forbidden.' });
		}
		if (draft.SessionId) {
			return res.status(409).json({ message: 'A payment session is already in progress for this order. Please go back and start a new checkout.' });
		}

		const cartItems       = JSON.parse(draft.CartItemsJson);
		const shippingOptions = JSON.parse(draft.ShippingOptionsJson);

		const subtotalCents = cartItems.reduce((sum, item) => {
			const shipType   = shippingOptions[item.ProductId];
			const totalPrice = shipType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;
			return sum + Math.round(totalPrice * 100) * item.Quantity;
		}, 0);

		const feeCents   = calcFeeCents(subtotalCents, 'paypal');
		const totalCents = subtotalCents + feeCents;
		const totalEur   = totalCents / 100;

		const paypalOrder = await createPaypalOrder(totalEur, 'Gibli Marketplace Order', draftId);
		await db.executeProcedure('InsertSessionIdToDraft', {
			DraftId:   draftId,
			SessionId: paypalOrder.id,
		});
		const approveUrl = paypalOrder.links?.find((l) => l.rel === 'approve')?.href;
		return res.json({ paypalOrderId: paypalOrder.id, approveUrl });
	} catch (err) {
		console.error('Error creating PayPal order:', err);
		res.status(500).json({ message: 'Failed to create PayPal order.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/capture-paypal-order
// Body: { paypalOrderId, draftId }
// Verifies paypalOrderId matches the one stored on the draft,
// captures payment, then creates marketplace orders.
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/capture-paypal-order', authenticateToken, async (req, res) => {
	const { paypalOrderId, draftId } = req.body;
	const userId = req.user.id;

	if (!paypalOrderId || !draftId) {
		return res.status(400).json({ message: 'paypalOrderId and draftId are required.' });
	}

	try {
		const draftResult = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
		const draft = draftResult.recordset?.[0];
		if (!draft) return res.status(404).json({ message: 'Checkout draft not found.' });

		if (String(draft.BuyerId) !== String(userId)) {
			return res.status(403).json({ message: 'Forbidden.' });
		}
		if (draft.SessionId !== paypalOrderId) {
			return res.status(400).json({ message: 'PayPal order ID does not match this checkout session.' });
		}

		const captureData = await capturePaypalOrder(paypalOrderId);

		if (captureData.status !== 'COMPLETED') {
			return res.status(400).json({ message: `PayPal capture status: ${captureData.status}` });
		}

		await fulfillOrder({ draftId, paymentId: paypalOrderId });

		return res.json({ success: true });
	} catch (err) {
		console.error('❌ PayPal capture error:', err);
		res.status(500).json({ message: 'Failed to capture PayPal payment.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/draft
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/draft', authenticateToken, async (req, res) => {
	const { cartItems, shippingOptions, shippingAddress } = req.body;
	const BuyerId = req.user.id;

	if (!Array.isArray(cartItems) || cartItems.length === 0 || !shippingOptions || !shippingAddress) {
		return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
	}

	try {
		// Re-fetch every product from the DB so prices are authoritative, not client-supplied
		const sanitizedCartItems = [];
		for (const item of cartItems) {
			const productResult = await db.executeProcedure('GetProductForCheckout', {
				ProductId: item.ProductId,
				UserId:    BuyerId,
				Quantity:  item.Quantity,
			});
			const product = productResult.recordset?.[0];
			if (!product) {
				return res.status(400).json({
					message: `"${item.ProductName || 'A product'}" is no longer available.`,
					code: 'PRODUCT_UNAVAILABLE',
				});
			}
			if (product.InStock < item.Quantity) {
				return res.status(400).json({
					message: `Only ${product.InStock} unit${product.InStock !== 1 ? 's' : ''} of "${product.ProductName}" are available.`,
					code: 'INSUFFICIENT_STOCK',
					productId: item.ProductId,
					available: product.InStock,
				});
			}
			// Only trust Quantity from the client; all prices come from the database
			sanitizedCartItems.push({ ...product, Quantity: item.Quantity });
		}

		const computeTotal = (items, opts) => {
			let total = 0;
			for (const it of items) {
				const qty      = Number(it.Quantity || 0);
				const unit     = Number(it.Price || 0);
				const shipType = opts?.[it.ProductId] || 'standard';
				const shipFee  = shipType === 'express'
					? Number(it.ExpressShippingPrice || it.ShippingPrice || 0)
					: Number(it.ShippingPrice || 0);
				total += qty * unit + shipFee;
			}
			return Number(total.toFixed(2));
		};

		const draftId     = v4();
		const totalAmount = computeTotal(sanitizedCartItems, shippingOptions);

		await db.executeProcedure('CreateCheckoutDraft', {
			DraftId:             draftId,
			BuyerId,
			CartItemsJson:       JSON.stringify(sanitizedCartItems),
			ShippingOptionsJson: JSON.stringify(shippingOptions),
			ShippingAddressJson: JSON.stringify(shippingAddress),
			TotalAmount:         totalAmount,
			SessionId:           null,
		});

		return res.status(201).json({ draftId, totalAmount });
	} catch (error) {
		console.error('Error creating draft:', error);
		return res.status(500).json({ message: 'Failed to create checkout draft.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/buy-now
// Creates a draft for a single product and returns { draftId, totalAmount }.
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/buy-now', authenticateToken, async (req, res) => {
	const { productId, quantity = 1, shippingType = 'standard', shippingId } = req.body;
	const userId = req.user.id;

	if (!productId) return res.status(400).json({ message: 'Product ID is required.' });

	try {
		const productResult = await db.executeProcedure('GetProductForCheckout', {
			ProductId: productId,
			UserId:    userId,
			Quantity:  quantity,
		});
		const product = productResult.recordset?.[0];
		if (!product) return res.status(404).json({ message: 'Product not found.' });

		if (product.InStock < quantity) {
			return res.status(400).json({ message: `Insufficient stock. Only ${product.InStock} units available.` });
		}

		// Enforce server-side: sellers cannot purchase their own products
		if (String(product.SellerId) === String(userId)) {
			return res.status(403).json({ message: 'You cannot purchase your own products.' });
		}

		// Resolve shipping address
		let shippingAddress;
		if (shippingId) {
			const allResult = await db.executeProcedure('GetShippingDetailsByUser', { UserId: userId });
			shippingAddress = (allResult.recordset || []).find((a) => String(a.ShippingId) === String(shippingId));
			if (!shippingAddress) return res.status(400).json({ message: 'Selected address not found.', code: 'NO_ADDRESS' });
		} else {
			const defResult = await db.executeProcedure('GetDefaultShipping', { UserId: userId });
			shippingAddress = defResult.recordset?.[0];
		}

		if (!shippingAddress) {
			return res.status(400).json({ message: 'No shipping address found.', code: 'NO_ADDRESS' });
		}
		if (!shippingAddress.AddressLine1 || !shippingAddress.City || !shippingAddress.Country || !shippingAddress.FullName || !shippingAddress.PostalCode) {
			return res.status(400).json({ message: 'Your shipping address is incomplete.', code: 'INCOMPLETE_ADDRESS' });
		}

		const cartItems      = [product];
		const shippingOptions = { [productId]: shippingType };

		const shipFee     = shippingType === 'express'
			? Number(product.ExpressShippingPrice || product.ShippingPrice || 0)
			: Number(product.ShippingPrice || 0);
		const totalAmount = Number((Number(product.Price) * quantity + shipFee).toFixed(2));

		const draftId = v4();
		await db.executeProcedure('CreateCheckoutDraft', {
			DraftId:             draftId,
			BuyerId:             userId,
			CartItemsJson:       JSON.stringify(cartItems),
			ShippingOptionsJson: JSON.stringify(shippingOptions),
			ShippingAddressJson: JSON.stringify({ default: shippingAddress, perItem: {} }),
			TotalAmount:         totalAmount,
			SessionId:           null,
		});

		return res.json({ draftId, totalAmount });
	} catch (err) {
		console.error('Buy Now error:', err);
		res.status(500).json({ message: 'Failed to process buy now request.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/activate-session
// Client-side fallback called by the success page in case the Stripe
// webhook was delayed or never fired. Idempotent — if the webhook
// already fulfilled the order (draft IsUsed=1), GetCheckoutDraft
// returns null and we return { fulfilled: true, alreadyProcessed: true }.
// Body: { sessionId }
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/activate-session', authenticateToken, async (req, res) => {
	const { sessionId } = req.body;
	const userId = req.user.id;

	if (!sessionId) return res.status(400).json({ message: 'sessionId is required.' });

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId);

		if (session.mode !== 'payment') {
			return res.status(400).json({ message: 'Not a product checkout session.' });
		}
		if (session.status !== 'complete') {
			return res.status(400).json({ message: 'Payment not yet completed.' });
		}
		if (String(session.metadata?.userId) !== String(userId)) {
			return res.status(403).json({ message: 'Session does not belong to this account.' });
		}

		// Retry sessions have no draft — they re-use existing orders with a new PI
		if (session.metadata?.isRetry === 'true') {
			await handleRetryCheckoutComplete(session);
			const deliveryStatus = session.metadata.paymentMethod === 'sepa' ? 'AwaitingPayment' : 'Processing';
			return res.json({ fulfilled: true, alreadyProcessed: false, deliveryStatus });
		}

		const draftId     = session.metadata.checkoutDraftId;
		const draftResult = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
		const draft       = draftResult.recordset?.[0];

		if (!draft) {
			// Draft consumed — verify orders actually exist before calling it done
			const piId = session.payment_intent;
			if (piId) {
				const existing = await db.executeProcedure('GetOrdersByPaymentIntentId', {
					PaymentIntentId: piId,
					StatusFilter:    null,
				});
				if (existing.recordset?.length > 0) {
					const deliveryStatus = existing.recordset[0]?.DeliveryStatus || 'Processing';
					return res.json({ fulfilled: true, alreadyProcessed: true, deliveryStatus });
				}
			}
			// Draft consumed but no orders found — payment received but fulfillment failed
			console.error(`⚠️ activate-session: draft ${draftId} consumed but no orders found for PI ${session.payment_intent}`);
			return res.status(409).json({
				message: 'Your payment was received but something went wrong creating your order. Please contact support and quote your session ID.',
				sessionId,
			});
		}

		const isSepa         = session.payment_method_types?.includes('sepa_debit');
		const deliveryStatus = isSepa ? 'AwaitingPayment' : 'Processing';

		await fulfillOrder({ draftId, paymentId: session.payment_intent, deliveryStatus });

		return res.json({ fulfilled: true, alreadyProcessed: false, deliveryStatus });
	} catch (err) {
		console.error('Error activating checkout session:', err);
		res.status(500).json({ message: 'Failed to activate session.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/create-retry-session
// Creates a new Stripe checkout session for orders stuck in
// PaymentFailed status (SEPA transfer rejected).  The buyer may
// choose a different payment method (card or SEPA).
// Body: { originalPaymentIntentId, paymentMethod: 'card' | 'sepa' }
// Returns: { url }
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/create-retry-session', authenticateToken, async (req, res) => {
	const { originalPaymentIntentId, paymentMethod = 'card' } = req.body;
	const userId = req.user.id;

	if (!originalPaymentIntentId) return res.status(400).json({ message: 'originalPaymentIntentId is required.' });

	try {
		const ordersResult = await db.executeProcedure('GetOrdersByPaymentIntentId', {
			PaymentIntentId: originalPaymentIntentId,
			StatusFilter:    'PaymentFailed',
		});
		const orders = ordersResult.recordset || [];

		if (!orders.length) return res.status(404).json({ message: 'No payment-failed orders found for this payment.' });
		if (String(orders[0].BuyerId) !== String(userId)) return res.status(403).json({ message: 'Forbidden.' });

		const subtotalCents  = Math.round(orders.reduce((sum, o) => sum + Number(o.TotalAmount), 0) * 100);
		const feeCents       = calcFeeCents(subtotalCents, paymentMethod);
		const paymentMethods = paymentMethod === 'sepa' ? ['sepa_debit'] : ['card'];

		const session = await stripe.checkout.sessions.create({
			payment_method_types: paymentMethods,
			mode: 'payment',
			line_items: [{
				price_data: {
					currency:     'eur',
					product_data: { name: 'Order Retry Payment — Gibli' },
					unit_amount:  subtotalCents + feeCents,
				},
				quantity: 1,
			}],
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url:  `${process.env.FRONTEND_URL}/orders`,
			metadata: {
				isRetry:               'true',
				originalPaymentIntentId,
				userId:                String(userId),
				paymentMethod,
			},
		});

		return res.json({ url: session.url });
	} catch (err) {
		console.error('Error creating retry session:', err);
		res.status(500).json({ message: 'Failed to create retry session.' });
	}
});

// ─────────────────────────────────────────────────────────────
// STRIPE WEBHOOK
// ─────────────────────────────────────────────────────────────

export const stripeWebhook = async (req, res) => {
	const sig = req.headers['stripe-signature'];

	let event;
	try {
		event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('⚠️ Webhook signature verification failed.', err.message);
		return res.sendStatus(400);
	}

	// Subscription events
	if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
		await handleSubscriptionCheckoutComplete(event.data.object);
		return res.status(200).end();
	}
	if (event.type === 'invoice.paid') {
		await handleInvoicePaid(event.data.object);
		return res.status(200).end();
	}
	if (event.type === 'invoice.payment_failed') {
		await handlePaymentFailed(event.data.object);
		return res.status(200).end();
	}
	if (event.type === 'customer.subscription.deleted') {
		await handleSubscriptionDeleted(event.data.object);
		return res.status(200).end();
	}
	if (event.type === 'customer.subscription.updated') {
		await handleSubscriptionUpdated(event.data.object);
		return res.status(200).end();
	}

	// SEPA: bank cleared the funds — promote AwaitingPayment orders to Processing
	if (event.type === 'payment_intent.succeeded') {
		await handlePaymentIntentSucceeded(event.data.object);
		return res.status(200).end();
	}

	// SEPA: bank payment ultimately failed — cancel AwaitingPayment orders
	if (event.type === 'payment_intent.payment_failed') {
		await handlePaymentIntentFailed(event.data.object);
		return res.status(200).end();
	}

	// Dispute opened (card or SEPA) — freeze payout, alert admin
	if (event.type === 'charge.dispute.created') {
		await handleChargeDisputeCreated(event.data.object);
		return res.status(200).end();
	}

	// Dispute resolved — unfreeze or write off payout, alert admin
	if (event.type === 'charge.dispute.closed') {
		await handleChargeDisputeClosed(event.data.object);
		return res.status(200).end();
	}

	// One-time payment checkout
	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;
		try {
			// Retry payment — re-uses existing orders with a new payment intent
			if (session.metadata?.isRetry === 'true') {
				await handleRetryCheckoutComplete(session);
				return res.status(200).send('✅ Retry checkout processed');
			}

			const draftId = session.metadata.checkoutDraftId;
			console.log('🧾 Webhook received, draftId:', draftId);

			// SEPA Direct Debit: mandate created immediately but funds take 1-3 days to clear.
			// Orders start as AwaitingPayment and are promoted by payment_intent.succeeded.
			const isSepa         = session.payment_method_types?.includes('sepa_debit');
			const deliveryStatus = isSepa ? 'AwaitingPayment' : 'Processing';

			await fulfillOrder({ draftId, paymentId: session.payment_intent, deliveryStatus });

			res.status(200).send('✅ Orders inserted successfully');
		} catch (err) {
			console.error('❌ Error processing webhook:', err);
			res.status(500).send('Webhook processing failed');
		}
	} else {
		res.status(200).end();
	}
};

// ─────────────────────────────────────────────────────────────
// PAYMENT INTENT HANDLERS (SEPA deferred settlement)
// ─────────────────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(paymentIntent) {
	try {
		const ordersResult = await db.executeProcedure('GetOrdersByPaymentIntentId', {
			PaymentIntentId: paymentIntent.id,
			StatusFilter:    'AwaitingPayment',
		});
		const orders = ordersResult.recordset || [];

		if (!orders.length) {
			// Card payments also fire payment_intent.succeeded — safe to ignore here
			console.log(`ℹ️ payment_intent.succeeded: no AwaitingPayment orders for ${paymentIntent.id}`);
			return;
		}

		// Fraud check via Stripe charge outcome
		try {
			const charges = await stripe.charges.list({ payment_intent: paymentIntent.id, limit: 1 });
			const charge  = charges.data?.[0];
			if (charge?.outcome?.risk_level === 'elevated' || charge?.outcome?.risk_level === 'highest') {
				await sendAdminAlertEmail(
					`High-risk SEPA payment — manual review required`,
					[
						`Risk level: ${charge.outcome.risk_level}`,
						`Risk score: ${charge.outcome.risk_score ?? 'N/A'}`,
						`Payment intent: ${paymentIntent.id}`,
						`Amount: €${((paymentIntent.amount_received || 0) / 100).toFixed(2)}`,
						`Buyer: ${orders[0]?.BuyerEmail || 'unknown'}`,
						`Orders: ${orders.map((o) => o.OrderId).join(', ')}`,
					]
				);
			}
		} catch (fraudErr) {
			console.error('⚠️ Fraud check failed:', fraudErr.message);
		}

		// Promote AwaitingPayment → Processing
		await db.executeProcedure('PromoteAwaitingOrders', { PaymentIntentId: paymentIntent.id });
		console.log(`✅ Promoted ${orders.length} order(s) to Processing for PI ${paymentIntent.id}`);

		// For each order: record commission + email seller
		for (const order of orders) {
			const orderItems      = JSON.parse(order.CartItemsJson || '[]');
			const shippingOptions = orderItems.reduce((acc, item) => {
				acc[item.ProductId] = item.ShippingType || 'standard';
				return acc;
			}, {});

			try {
				const commResult      = await db.executeProcedure('GetSellerCommissionRate', { SellerId: order.SellerId });
				const commissionRate  = commResult.recordset?.[0]?.CommissionRate ?? 0.05;
				const subscriptionId  = commResult.recordset?.[0]?.SubscriptionId ?? null;
				const commissionAmount = Number((order.TotalAmount * commissionRate).toFixed(2));
				const netAmount        = Number((order.TotalAmount - commissionAmount).toFixed(2));
				await db.executeProcedure('RecordCommission', {
					OrderId:          order.OrderId,
					SellerId:         order.SellerId,
					SubscriptionId:   subscriptionId,
					GrossAmount:      order.TotalAmount,
					CommissionRate:   commissionRate,
					CommissionAmount: commissionAmount,
					NetAmount:        netAmount,
				});
			} catch (commErr) {
				console.error('⚠️ Commission recording failed for order', order.OrderId, commErr.message);
			}

			try {
				const address = {
					City:            order.ShippingCity,
					Country:         order.ShippingCountry,
					StateOrProvince: order.ShippingStateOrProvince || '',
					FullName:        order.ShippingFullName,
					AddressLine1:    order.ShippingAddressLine1,
					PostalCode:      order.ShippingPostalCode,
				};
				await sendSellerOrderNotificationEmail(
					order.SellerEmail,
					order.SellerBusinessName,
					orderItems,
					shippingOptions,
					address,
					order.TotalAmount
				);
			} catch (emailErr) {
				console.error('⚠️ Seller notification email failed for order', order.OrderId, emailErr.message);
			}
		}

		// Email buyer: payment confirmed
		try {
			const allItems        = orders.flatMap((o) => JSON.parse(o.CartItemsJson || '[]'));
			const totalAmount     = orders.reduce((sum, o) => sum + Number(o.TotalAmount), 0);
			const shippingOptions = allItems.reduce((acc, item) => {
				acc[item.ProductId] = item.ShippingType || 'standard';
				return acc;
			}, {});
			await sendSepaPaymentConfirmedEmail(
				orders[0].BuyerEmail,
				orders[0].BuyerName,
				allItems,
				totalAmount,
				shippingOptions
			);
		} catch (emailErr) {
			console.error('⚠️ Buyer payment confirmed email failed:', emailErr.message);
		}
	} catch (err) {
		console.error('❌ handlePaymentIntentSucceeded error:', err);
	}
}

async function handlePaymentIntentFailed(paymentIntent) {
	try {
		const ordersResult = await db.executeProcedure('GetOrdersByPaymentIntentId', {
			PaymentIntentId: paymentIntent.id,
			StatusFilter:    'AwaitingPayment',
		});
		const orders = ordersResult.recordset || [];

		if (!orders.length) {
			console.log(`ℹ️ payment_intent.payment_failed: no AwaitingPayment orders for ${paymentIntent.id}`);
			return;
		}

		// Mark as PaymentFailed — stock held for 30 days pending buyer retry
		await db.executeProcedure('SetPaymentFailedOrders', { PaymentIntentId: paymentIntent.id });
		console.log(`⚠️ Marked ${orders.length} order(s) as PaymentFailed for PI ${paymentIntent.id}`);

		// Email buyer with retry link
		try {
			const totalAmount = orders.reduce((sum, o) => sum + Number(o.TotalAmount), 0);
			const retryUrl    = `${process.env.FRONTEND_URL}/orders?retry=${encodeURIComponent(paymentIntent.id)}`;
			await sendSepaPaymentFailedEmail(
				orders[0].BuyerEmail,
				orders[0].BuyerName,
				totalAmount,
				retryUrl
			);
		} catch (emailErr) {
			console.error('⚠️ Payment failed email could not be sent:', emailErr.message);
		}
	} catch (err) {
		console.error('❌ handlePaymentIntentFailed error:', err);
	}
}

// ─────────────────────────────────────────────────────────────
// DISPUTE HANDLERS  (card + SEPA)
// ─────────────────────────────────────────────────────────────

async function handleChargeDisputeCreated(dispute) {
	try {
		const piId = dispute.payment_intent;

		// Find affected orders (null StatusFilter = all statuses)
		const ordersResult = piId
			? await db.executeProcedure('GetOrdersByPaymentIntentId', { PaymentIntentId: piId, StatusFilter: null })
			: { recordset: [] };
		const orders = ordersResult.recordset || [];

		// Freeze seller payout so it cannot be paid out while dispute is open.
		// Returns previous status — if 'Paid', funds are already with the seller.
		if (piId) {
			try {
				const freezeResult  = await db.executeProcedure('FreezeSellerPayoutByPI', {
					PaymentIntentId: piId,
					DisputeId:       dispute.id,
				});
				const frozenPayouts = freezeResult.recordset || [];
				const alreadyPaid   = frozenPayouts.some((p) => p.PrevStatus === 'Paid');
				if (alreadyPaid) {
					console.error(`🚨 Dispute ${dispute.id}: payout was already PAID before dispute — manual seller recovery needed`);
				}
				// Merge payout status back into orders for the email
				for (const o of orders) {
					const match = frozenPayouts.find((p) => p.PayoutId);
					if (match) o.PayoutStatus = match.PrevStatus;
				}
				console.log(`⚠️ Seller payout frozen for dispute ${dispute.id} (${frozenPayouts.length} payout(s), PI: ${piId})`);
			} catch (freezeErr) {
				console.error('⚠️ Failed to freeze seller payout:', freezeErr.message);
			}
		}

		// Alert admin immediately
		await sendDisputeAlertEmail('created', dispute, orders);

		console.log(`⚠️ Dispute opened: ${dispute.id} — reason: ${dispute.reason} — ${orders.length} order(s) affected`);
	} catch (err) {
		console.error('❌ handleChargeDisputeCreated error:', err);
	}
}

async function handleChargeDisputeClosed(dispute) {
	try {
		const piId    = dispute.payment_intent;
		const outcome = dispute.status === 'won' ? 'won' : 'lost';

		const ordersResult = piId
			? await db.executeProcedure('GetOrdersByPaymentIntentId', { PaymentIntentId: piId, StatusFilter: null })
			: { recordset: [] };
		const orders = ordersResult.recordset || [];

		if (piId) {
			try {
				await db.executeProcedure('UnfreezeSellerPayoutByPI', {
					PaymentIntentId: piId,
					DisputeId:       dispute.id,
					Outcome:         outcome,
				});
				console.log(`ℹ️ Dispute ${dispute.id} closed (${outcome}) — payout updated`);
			} catch (unfreezeErr) {
				console.error('⚠️ Failed to unfreeze seller payout:', unfreezeErr.message);
			}
		}

		// Alert admin with outcome
		await sendDisputeAlertEmail('closed', dispute, orders);

		console.log(`ℹ️ Dispute closed: ${dispute.id} — outcome: ${outcome}`);
	} catch (err) {
		console.error('❌ handleChargeDisputeClosed error:', err);
	}
}

// Called when a buyer completes a retry checkout session after SEPA failure.
// For SEPA retry: updates orders to AwaitingPayment + new PI, sends bank-transfer email.
// For card retry: updates orders to Processing + new PI, records commission, emails all parties.
async function handleRetryCheckoutComplete(session) {
	try {
		const { originalPaymentIntentId, userId, paymentMethod } = session.metadata || {};
		const newPaymentIntentId = session.payment_intent;
		const isSepa             = paymentMethod === 'sepa';

		const ordersResult = await db.executeProcedure('GetOrdersByPaymentIntentId', {
			PaymentIntentId: originalPaymentIntentId,
			StatusFilter:    'PaymentFailed',
		});
		const orders = ordersResult.recordset || [];

		if (!orders.length) {
			console.log(`ℹ️ Retry checkout: no PaymentFailed orders for ${originalPaymentIntentId}`);
			return;
		}
		if (String(orders[0].BuyerId) !== String(userId)) {
			console.error(`⚠️ Retry checkout: userId ${userId} does not own orders for PI ${originalPaymentIntentId}`);
			return;
		}

		// Fraud check
		if (newPaymentIntentId) {
			try {
				const charges = await stripe.charges.list({ payment_intent: newPaymentIntentId, limit: 1 });
				const charge  = charges.data?.[0];
				if (charge?.outcome?.risk_level === 'elevated' || charge?.outcome?.risk_level === 'highest') {
					await sendAdminAlertEmail(
						`High-risk retry payment — manual review required`,
						[
							`Risk level: ${charge.outcome.risk_level}`,
							`Payment intent: ${newPaymentIntentId}`,
							`Original PI: ${originalPaymentIntentId}`,
							`Buyer: ${orders[0].BuyerEmail}`,
						]
					);
				}
			} catch (fraudErr) {
				console.error('⚠️ Fraud check failed for retry:', fraudErr.message);
			}
		}

		const newDeliveryStatus = isSepa ? 'AwaitingPayment' : 'Processing';

		await db.executeProcedure('RetryOrderPayment', {
			OriginalPaymentIntentId: originalPaymentIntentId,
			NewPaymentIntentId:      newPaymentIntentId,
			NewDeliveryStatus:       newDeliveryStatus,
			BuyerId:                 String(userId),
		});

		if (isSepa) {
			// payment_intent.succeeded handles commission + seller email when funds clear
			try {
				const allItems        = orders.flatMap((o) => JSON.parse(o.CartItemsJson || '[]'));
				const totalAmount     = orders.reduce((sum, o) => sum + Number(o.TotalAmount), 0);
				const shippingOptions = allItems.reduce((acc, item) => {
					acc[item.ProductId] = item.ShippingType || 'standard';
					return acc;
				}, {});
				await sendSepaOrderReceivedEmail(orders[0].BuyerEmail, orders[0].BuyerName, allItems, totalAmount, shippingOptions);
			} catch (emailErr) {
				console.error('⚠️ SEPA retry received email failed:', emailErr.message);
			}
		} else {
			// Card: immediate commission + seller + buyer emails
			for (const order of orders) {
				const orderItems      = JSON.parse(order.CartItemsJson || '[]');
				const shippingOptions = orderItems.reduce((acc, item) => {
					acc[item.ProductId] = item.ShippingType || 'standard';
					return acc;
				}, {});

				try {
					const commResult      = await db.executeProcedure('GetSellerCommissionRate', { SellerId: order.SellerId });
					const commissionRate  = commResult.recordset?.[0]?.CommissionRate ?? 0.05;
					const subscriptionId  = commResult.recordset?.[0]?.SubscriptionId ?? null;
					const commissionAmount = Number((order.TotalAmount * commissionRate).toFixed(2));
					const netAmount        = Number((order.TotalAmount - commissionAmount).toFixed(2));
					await db.executeProcedure('RecordCommission', {
						OrderId:          order.OrderId,
						SellerId:         order.SellerId,
						SubscriptionId:   subscriptionId,
						GrossAmount:      order.TotalAmount,
						CommissionRate:   commissionRate,
						CommissionAmount: commissionAmount,
						NetAmount:        netAmount,
					});
				} catch (commErr) {
					console.error('⚠️ Commission failed for retry order', order.OrderId, commErr.message);
				}

				try {
					const address = {
						City:            order.ShippingCity,
						Country:         order.ShippingCountry,
						StateOrProvince: order.ShippingStateOrProvince || '',
						FullName:        order.ShippingFullName,
						AddressLine1:    order.ShippingAddressLine1,
						PostalCode:      order.ShippingPostalCode,
					};
					await sendSellerOrderNotificationEmail(
						order.SellerEmail,
						order.SellerBusinessName,
						orderItems,
						shippingOptions,
						address,
						order.TotalAmount
					);
				} catch (emailErr) {
					console.error('⚠️ Seller email failed for retry order', order.OrderId, emailErr.message);
				}
			}

			try {
				const allItems        = orders.flatMap((o) => JSON.parse(o.CartItemsJson || '[]'));
				const totalAmount     = orders.reduce((sum, o) => sum + Number(o.TotalAmount), 0);
				const shippingOptions = allItems.reduce((acc, item) => {
					acc[item.ProductId] = item.ShippingType || 'standard';
					return acc;
				}, {});
				await sendBuyerOrderConfirmationEmail(orders[0].BuyerEmail, orders[0].BuyerName, allItems, totalAmount, shippingOptions);
			} catch (emailErr) {
				console.error('⚠️ Buyer confirmation email failed for retry:', emailErr.message);
			}
		}

		console.log(`✅ Retry complete — original PI ${originalPaymentIntentId} → new PI ${newPaymentIntentId} (${newDeliveryStatus})`);
	} catch (err) {
		console.error('❌ handleRetryCheckoutComplete error:', err);
	}
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION WEBHOOK HANDLERS
// ─────────────────────────────────────────────────────────────

async function handleSubscriptionCheckoutComplete(session) {
	try {
		const { sellerId, planId, planCode, previousStripeSubId } = session.metadata || {};
		if (!sellerId || !planId) {
			console.error('⚠️ Subscription checkout missing metadata:', session.metadata);
			return;
		}

		const stripeSubId = typeof session.subscription === 'string'
			? session.subscription
			: session.subscription?.id;
		const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

		const existingCheck = await db.executeProcedure('GetSubscriptionByStripeSubId', {
			StripeSubscriptionId: stripeSub.id,
		});
		if (existingCheck.recordset?.length) {
			console.log(`ℹ️ Webhook: subscription ${stripeSub.id} already activated — skipping.`);
			return;
		}

		// Cancel the previous plan only after the new payment is confirmed
		if (previousStripeSubId) {
			try {
				await stripe.subscriptions.update(previousStripeSubId, { cancel_at_period_end: true });
				await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
					StripeSubscriptionId: previousStripeSubId,
					Status:               'cancelling',
					CancelAtPeriodEnd:    1,
				});
			} catch (cancelErr) {
				console.error('⚠️ Could not cancel previous subscription:', cancelErr.message);
			}
		}

		const currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
		const currentPeriodEnd   = new Date(stripeSub.current_period_end   * 1000);
		const status = stripeSub.status === 'trialing' ? 'pending_trial' : 'active';

		const newSubResult = await db.executeProcedure('CreateSellerSubscription', {
			SellerId:             sellerId,
			PlanId:               Number(planId),
			Status:               status,
			StartDate:            new Date(),
			CurrentPeriodStart:   currentPeriodStart,
			CurrentPeriodEnd:     currentPeriodEnd,
			StripeSubscriptionId: stripeSub.id,
			StripeCustomerId:     session.customer,
		});

		const newSubscriptionId = newSubResult.recordset?.[0]?.SubscriptionId;

		await db.executeProcedure('ExpireStaleSubscriptions', {});

		if (session.customer) {
			try {
				await db.executeProcedure('UpdateSellerStripeCustomerId', {
					SellerId:         sellerId,
					StripeCustomerId: session.customer,
				});
			} catch (custErr) {
				console.warn('⚠️ Could not save StripeCustomerId:', custErr.message);
			}
		}

		if (status === 'active' && session.invoice) {
			try {
				const invoice = await stripe.invoices.retrieve(session.invoice);
				if (invoice.status === 'paid') {
					await db.executeProcedure('CreateSubscriptionPayment', {
						SubscriptionId:        newSubscriptionId,
						SellerId:              sellerId,
						Amount:                invoice.amount_paid / 100,
						Currency:              (invoice.currency || 'eur').toUpperCase(),
						StripeInvoiceId:       invoice.id,
						StripePaymentIntentId: invoice.payment_intent,
						Status:                'successful',
						BillingPeriodStart:    currentPeriodStart,
						BillingPeriodEnd:      currentPeriodEnd,
						PaidAt:                new Date(invoice.status_transitions.paid_at * 1000),
					});
				}
			} catch (invErr) {
				console.error('⚠️ Could not record initial subscription payment:', invErr.message);
			}
		}

		try {
			const [sellerResult, plansResult] = await Promise.all([
				db.executeProcedure('GetSellerDetails', { SellerId: sellerId }),
				db.executeProcedure('GetSubscriptionPlans', {}),
			]);
			const seller = sellerResult.recordset?.[0];
			const plan   = plansResult.recordset.find((p) => p.PlanId === Number(planId));

			let emailTarget = seller ? { email: seller.Email, name: seller.BusinessName } : null;
			if (!emailTarget) {
				const userResult = await db.executeProcedure('GetUserById', { UserId: sellerId });
				const user = userResult.recordset?.[0];
				if (user) emailTarget = { email: user.Email, name: user.Username };
			}
			if (emailTarget && plan) {
				await sendSubscriptionConfirmationEmail(
					emailTarget.email, emailTarget.name,
					plan.PlanName, plan.Price, plan.BillingCycle, currentPeriodEnd
				);
			}
		} catch (emailErr) {
			console.error('⚠️ Could not send subscription confirmation email:', emailErr.message);
		}

		console.log(`✅ Subscription created for seller ${sellerId}, plan ${planCode}`);
	} catch (err) {
		console.error('❌ handleSubscriptionCheckoutComplete error:', err);
	}
}

async function handleInvoicePaid(invoice) {
	try {
		const stripeSubId = invoice.subscription;
		if (!stripeSubId) return;

		const line = invoice.lines?.data?.[0];
		const currentPeriodStart = line?.period?.start ? new Date(line.period.start * 1000) : new Date();
		const currentPeriodEnd   = line?.period?.end   ? new Date(line.period.end   * 1000) : null;

		await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
			StripeSubscriptionId: stripeSubId,
			Status:               'active',
			CurrentPeriodStart:   currentPeriodStart,
			CurrentPeriodEnd:     currentPeriodEnd,
			CancelAtPeriodEnd:    0,
			ReminderSent14:       0,
			ReminderSent7:        0,
			ReminderSent1:        0,
		});

		const lookupResult = await db.executeProcedure('GetSubscriptionByStripeSubId', {
			StripeSubscriptionId: stripeSubId,
		});
		const subRow = lookupResult?.recordset?.[0];
		if (!subRow) return;

		await db.executeProcedure('CreateSubscriptionPayment', {
			SubscriptionId:        subRow.SubscriptionId,
			SellerId:              subRow.SellerId,
			Amount:                invoice.amount_paid / 100,
			Currency:              (invoice.currency || 'eur').toUpperCase(),
			StripeInvoiceId:       invoice.id,
			StripePaymentIntentId: invoice.payment_intent,
			Status:                'successful',
			BillingPeriodStart:    currentPeriodStart,
			BillingPeriodEnd:      currentPeriodEnd,
			PaidAt: invoice.status_transitions?.paid_at
				? new Date(invoice.status_transitions.paid_at * 1000)
				: new Date(),
		});

		console.log(`✅ Subscription renewed: ${stripeSubId}`);
	} catch (err) {
		console.error('❌ handleInvoicePaid error:', err);
	}
}

async function handlePaymentFailed(invoice) {
	try {
		const stripeSubId = invoice.subscription;
		if (!stripeSubId) return;

		const updateResult = await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
			StripeSubscriptionId: stripeSubId,
			Status: 'payment_failed',
		});
		const subRow = updateResult?.recordset?.[0];
		if (!subRow) return;

		try {
			const sellerResult = await db.executeProcedure('GetSellerDetails', { SellerId: subRow.SellerId });
			const seller = sellerResult.recordset?.[0];
			if (seller) await sendSubscriptionPaymentFailedEmail(seller.Email, seller.BusinessName, subRow.PlanName);
		} catch (emailErr) {
			console.error('⚠️ Could not send payment failed email:', emailErr.message);
		}
	} catch (err) {
		console.error('❌ handlePaymentFailed error:', err);
	}
}

async function handleSubscriptionDeleted(stripeSub) {
	try {
		const updateResult = await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
			StripeSubscriptionId: stripeSub.id,
			Status: 'expired',
		});
		const subRow = updateResult?.recordset?.[0];
		if (!subRow) return;

		await db.executeProcedure('ExpireStaleSubscriptions', {});

		try {
			const sellerResult = await db.executeProcedure('GetSellerDetails', { SellerId: subRow.SellerId });
			const seller = sellerResult.recordset?.[0];
			if (seller) await sendSubscriptionExpiredEmail(seller.Email, seller.BusinessName, subRow.PlanName);
		} catch (emailErr) {
			console.error('⚠️ Could not send expiry email:', emailErr.message);
		}
	} catch (err) {
		console.error('❌ handleSubscriptionDeleted error:', err);
	}
}

async function handleSubscriptionUpdated(stripeSub) {
	try {
		await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
			StripeSubscriptionId: stripeSub.id,
			CancelAtPeriodEnd: stripeSub.cancel_at_period_end ? 1 : 0,
			Status: stripeSub.cancel_at_period_end ? 'cancelling' : 'active',
		});
	} catch (err) {
		console.error('❌ handleSubscriptionUpdated error:', err);
	}
}

// ─────────────────────────────────────────────────────────────
// PAYPAL WEBHOOK  (PAYMENT.CAPTURE.COMPLETED)
//
// Safety net: if the buyer closes the tab after PayPal approval
// the client-side capture-paypal-order call never fires.
// PayPal sends this event ~seconds after capture regardless.
// ClaimCheckoutDraftBySessionId is atomic — whichever path runs
// first claims the draft; the other gets an empty result and exits.
// ─────────────────────────────────────────────────────────────

async function handlePaypalCaptureCompleted(capture) {
	try {
		// The PayPal order ID is the SessionId we stored on the draft.
		// It lives under supplementary_data.related_ids.order_id on the capture resource.
		const paypalOrderId = capture.supplementary_data?.related_ids?.order_id;
		if (!paypalOrderId) {
			console.error('⚠️ PayPal capture webhook: no order_id in supplementary_data', JSON.stringify(capture).slice(0, 300));
			return;
		}

		const claimResult = await db.executeProcedure('ClaimCheckoutDraftBySessionId', { SessionId: paypalOrderId });
		const draftRow    = claimResult?.recordset?.[0];

		if (!draftRow) {
			// Client-side capture already claimed the draft — nothing to do
			console.log(`ℹ️ PayPal webhook: draft already claimed for order ${paypalOrderId}`);
			return;
		}

		await fulfillOrder({ draftId: draftRow.DraftId, paymentId: paypalOrderId, preClaimedDraft: draftRow });
		console.log(`✅ PayPal webhook: order ${paypalOrderId} fulfilled via PAYMENT.CAPTURE.COMPLETED`);
	} catch (err) {
		console.error('❌ handlePaypalCaptureCompleted error:', err);
	}
}

export const paypalWebhook = async (req, res) => {
	const event = req.body;

	if (event?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
		await handlePaypalCaptureCompleted(event.resource);
	} else {
		console.log(`ℹ️ PayPal webhook: ignored event type ${event?.event_type}`);
	}

	res.status(200).end();
};

export default checkoutRouter;
