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

async function createPaypalOrder(totalEur, description) {
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
				return_url: `${process.env.FRONTEND_URL}/payment/success`,
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
// SHARED ORDER FULFILMENT (used by Stripe webhook + PayPal capture)
// ─────────────────────────────────────────────────────────────

async function fulfillOrder({ draftId, userId, paymentId }) {
	const draftResult = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
	const draftRow = draftResult?.recordset?.[0];
	if (!draftRow) throw new Error(`No checkout draft found for ID: ${draftId}`);

	const cartItems        = JSON.parse(draftRow.CartItemsJson);
	const shippingOptions  = JSON.parse(draftRow.ShippingOptionsJson);
	const shippingAddressRaw = JSON.parse(draftRow.ShippingAddressJson);
	const { defaultAddress, perItem } = parseShippingAddress(shippingAddressRaw);

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
		const sellerId     = items[0].SellerId;
		const orderAddress = getAddressForItem(items[0], defaultAddress, perItem);
		const orderShippingId = orderAddress?.ShippingId;

		const sellerOrderTotal = items.reduce((sum, i) => {
			const shipType   = shippingOptions?.[i.ProductId] || 'standard';
			const totalPrice = shipType === 'express' ? (i.ExpressTotalPrice || i.TotalPrice) : i.TotalPrice;
			return sum + totalPrice;
		}, 0);

		const newOrderId = uuidv4();
		await db.executeProcedure('CreateOrder', {
			OrderId:         newOrderId,
			BuyerId:         userId,
			SellerId:        sellerId,
			ShippingId:      orderShippingId,
			TotalAmount:     sellerOrderTotal,
			PaymentIntentId: paymentId,
			DeliveryStatus:  'Processing',
			CartItemsJson:   JSON.stringify(items),
		});

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

		const seller = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
		await sendSellerOrderNotificationEmail(
			seller.recordset[0].Email,
			seller.recordset[0].BusinessName,
			items,
			shippingOptions,
			orderAddress,
			sellerOrderTotal
		);
	}

	await db.executeProcedure('MarkCheckoutDraftAsUsed', { DraftId: draftId });
	await db.executeProcedure('ClearUserCart', { UserId: userId });

	const buyer = await db.executeProcedure('GetUserById', { UserId: userId });
	await sendBuyerOrderConfirmationEmail(
		buyer.recordset[0].Email,
		buyer.recordset[0].Username,
		cartItems,
		draftRow.TotalAmount,
		shippingOptions
	);
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

	const result = await db.executeProcedure('GetCheckoutDraft', { draftId });
	const draft  = result.recordset?.[0];
	if (!draft) return res.status(404).json({ message: 'Checkout draft not found.' });

	const cartItems          = JSON.parse(draft.CartItemsJson);
	const shippingOptions    = JSON.parse(draft.ShippingOptionsJson);
	const shippingAddressRaw = JSON.parse(draft.ShippingAddressJson);
	const { defaultAddress } = parseShippingAddress(shippingAddressRaw);

	if (!cartItems?.length || !shippingOptions || !defaultAddress) {
		return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
	}

	try {
		const lineItemsWithFee = buildStripeLineItems(cartItems, shippingOptions, paymentMethod);

		const paymentMethods = paymentMethod === 'sepa' ? ['sepa_debit'] : ['card'];

		const session = await stripe.checkout.sessions.create({
			payment_method_types: paymentMethods,
			mode: 'payment',
			line_items: lineItemsWithFee,
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url:  `${process.env.FRONTEND_URL}/payment/fail`,
			metadata: {
				userId:           cartItems[0].UserId,
				checkoutDraftId:  draftId,
				shippingAddressId: defaultAddress.ShippingId,
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

	const result = await db.executeProcedure('GetCheckoutDraft', { draftId });
	const draft  = result.recordset?.[0];
	if (!draft) return res.status(404).json({ message: 'Checkout draft not found.' });

	const cartItems       = JSON.parse(draft.CartItemsJson);
	const shippingOptions = JSON.parse(draft.ShippingOptionsJson);

	const subtotalCents = cartItems.reduce((sum, item) => {
		const shipType   = shippingOptions[item.ProductId];
		const totalPrice = shipType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;
		return sum + Math.round(totalPrice * 100) * item.Quantity;
	}, 0);

	const feeCents    = calcFeeCents(subtotalCents, 'paypal');
	const totalCents  = subtotalCents + feeCents;
	const totalEur    = totalCents / 100;

	try {
		const paypalOrder = await createPaypalOrder(totalEur, 'Gibli Marketplace Order');
		// Store PayPal order ID in the draft's SessionId field for idempotency checks
		await db.executeProcedure('InsertSessionIdToDraft', {
			DraftId:   draftId,
			SessionId: paypalOrder.id,
		});
		return res.json({ paypalOrderId: paypalOrder.id });
	} catch (err) {
		console.error('Error creating PayPal order:', err);
		res.status(500).json({ message: 'Failed to create PayPal order.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /checkout/capture-paypal-order
// Body: { paypalOrderId, draftId }
// Captures payment then creates marketplace orders
// ─────────────────────────────────────────────────────────────
checkoutRouter.post('/capture-paypal-order', authenticateToken, async (req, res) => {
	const { paypalOrderId, draftId } = req.body;
	const userId = req.user.id;

	if (!paypalOrderId || !draftId) {
		return res.status(400).json({ message: 'paypalOrderId and draftId are required.' });
	}

	try {
		const captureData = await capturePaypalOrder(paypalOrderId);

		if (captureData.status !== 'COMPLETED') {
			return res.status(400).json({ message: `PayPal capture status: ${captureData.status}` });
		}

		await fulfillOrder({ draftId, userId, paymentId: paypalOrderId });

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
					message: `Only ${product.InStock} unit${product.InStock !== 1 ? 's' : ''} of "${item.ProductName}" are available.`,
					code: 'INSUFFICIENT_STOCK',
					productId: item.ProductId,
					available: product.InStock,
				});
			}
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
		const totalAmount = computeTotal(cartItems, shippingOptions);

		await db.executeProcedure('CreateCheckoutDraft', {
			DraftId:            draftId,
			BuyerId,
			CartItemsJson:      JSON.stringify(cartItems),
			ShippingOptionsJson: JSON.stringify(shippingOptions),
			ShippingAddressJson: JSON.stringify(shippingAddress),
			TotalAmount:        totalAmount,
			SessionId:          null,
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
// The frontend then shows the payment method selector.
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

		const shipFee    = shippingType === 'express'
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

	// One-time payment checkout
	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;
		try {
			const draftId = session.metadata.checkoutDraftId;
			const userId  = session.metadata.userId;

			console.log('🧾 Webhook received, draftId:', draftId);

			await fulfillOrder({ draftId, userId, paymentId: session.payment_intent });

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
// SUBSCRIPTION WEBHOOK HANDLERS
// ─────────────────────────────────────────────────────────────

async function handleSubscriptionCheckoutComplete(session) {
	try {
		const { sellerId, planId, planCode } = session.metadata || {};
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
					SellerId:        sellerId,
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

export default checkoutRouter;
