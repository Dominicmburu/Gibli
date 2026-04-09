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

/**
 * Compute the processing fee line item (in cents) to add to a Stripe session
 * so that after Stripe takes its cut (1.5% + €0.25), Gibli receives exactly
 * the product+shipping subtotal.
 *
 * Formula: grossCharge = (subtotal + fixed) / (1 - rate)
 *          fee = grossCharge - subtotal  → rounded UP to nearest cent
 *
 * 1.5% covers EU cards (1.4%) with a small buffer for non-EU transactions.
 */
const STRIPE_RATE  = 0.015; // 1.5%
const STRIPE_FIXED = 25;    // €0.25 in cents

function calcProcessingFeeCents(subtotalCents) {
	return Math.ceil((subtotalCents + STRIPE_FIXED) / (1 - STRIPE_RATE) - subtotalCents);
}

// Helper: Parse shipping address from draft (handles both old and new format)
const parseShippingAddress = (shippingAddress) => {
	// New format: { default: {...}, perItem: { ProductId: {...}, ... } }
	if (shippingAddress && shippingAddress.default) {
		return {
			defaultAddress: shippingAddress.default,
			perItem: shippingAddress.perItem || {},
		};
	}
	// Old format: single address object
	return {
		defaultAddress: shippingAddress,
		perItem: {},
	};
};

// Helper: Get the shipping address for a specific item
const getAddressForItem = (item, defaultAddress, perItem) => {
	if (perItem[item.ProductId]) {
		return perItem[item.ProductId];
	}
	return defaultAddress;
};

// ✅ Create Checkout Session
checkoutRouter.post('/create-session', authenticateToken, async (req, res) => {
	const { draftId } = req.body;
	const result = await db.executeProcedure('GetCheckoutDraft', { draftId });
	const draft = result.recordset?.[0];
	if (!draft) {
		return res.status(404).json({ message: 'Checkout draft not found.' });
	}
	// Parse JSON fields
	const cartItems = JSON.parse(draft.CartItemsJson);
	const shippingOptions = JSON.parse(draft.ShippingOptionsJson);
	const shippingAddressRaw = JSON.parse(draft.ShippingAddressJson);
	const { defaultAddress } = parseShippingAddress(shippingAddressRaw);

	if (!cartItems?.length || !shippingOptions || !defaultAddress) {
		console.log('Missing cart, shipping, or address details.');
		return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
	}

	try {
		// 🧮 Compute line items
		const lineItems = cartItems.map((item) => {
			const shippingType = shippingOptions[item.ProductId];
			const shippingFee = shippingType === 'express' ? item.ExpressShippingPrice : item.ShippingPrice;

			const totalPrice = shippingType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;

			const descriptionParts = [];
			if (item.SellerName) descriptionParts.push(`Sold by: ${item.SellerName}`);
			descriptionParts.push(`${shippingType === 'express' ? 'Express' : 'Standard'} shipping: €${Number(shippingFee).toFixed(2)}`);
			descriptionParts.push(`Unit price: €${Number(item.Price).toFixed(2)}`);

			return {
				price_data: {
					currency: 'eur',
					product_data: {
						name: item.ProductName,
						description: descriptionParts.join(' · '),
						images: item.ProductImageUrl ? [item.ProductImageUrl] : [],
					},
					unit_amount: Math.round(totalPrice * 100), // Stripe uses cents
				},
				quantity: item.Quantity,
			};
		});

		// Add processing fee so Gibli receives exactly the product subtotal after Stripe's cut
		const subtotalCents = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
		const feeCents = calcProcessingFeeCents(subtotalCents);
		const lineItemsWithFee = [
			...lineItems,
			{
				price_data: {
					currency: 'eur',
					product_data: { name: 'Processing fee' },
					unit_amount: feeCents,
				},
				quantity: 1,
			},
		];

		// 💳 Create Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card', 'sepa_debit'],
			mode: 'payment',
			line_items: lineItemsWithFee,
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.FRONTEND_URL}/payment/fail`,
			metadata: {
				userId: cartItems[0].UserId,
				checkoutDraftId: draftId,
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

// POST /checkout/buy-now - Direct checkout for single product (Buy Now button)
checkoutRouter.post('/buy-now', authenticateToken, async (req, res) => {
	const { productId, quantity = 1, shippingType = 'standard', shippingId } = req.body;
	const userId = req.user.id;

	if (!productId) {
		return res.status(400).json({ message: 'Product ID is required.' });
	}

	try {
		// 1. Get product details in checkout format
		const productResult = await db.executeProcedure('GetProductForCheckout', {
			ProductId: productId,
			UserId: userId,
			Quantity: quantity,
		});

		const product = productResult.recordset?.[0];
		if (!product) {
			return res.status(404).json({ message: 'Product not found.' });
		}

		// Check stock availability
		if (product.InStock < quantity) {
			return res.status(400).json({
				message: `Insufficient stock. Only ${product.InStock} units available.`
			});
		}

		// 2. Get shipping address - use specific address if shippingId provided, otherwise default
		let shippingAddress;
		if (shippingId) {
			// Fetch all user addresses and find the selected one
			const allAddressesResult = await db.executeProcedure('GetShippingDetailsByUser', { UserId: userId });
			const allAddresses = allAddressesResult.recordset || [];
			shippingAddress = allAddresses.find((a) => String(a.ShippingId) === String(shippingId));

			if (!shippingAddress) {
				return res.status(400).json({
					message: 'Selected shipping address not found.',
					code: 'NO_ADDRESS'
				});
			}
		} else {
			// Fall back to default address
			const addressResult = await db.executeProcedure('GetDefaultShipping', { UserId: userId });
			shippingAddress = addressResult.recordset?.[0];
		}

		if (!shippingAddress) {
			return res.status(400).json({
				message: 'No shipping address found. Please add a shipping address first.',
				code: 'NO_ADDRESS'
			});
		}

		// Validate address completeness
		if (!shippingAddress.AddressLine1 || !shippingAddress.City ||
			!shippingAddress.Country || !shippingAddress.FullName || !shippingAddress.PostalCode) {
			return res.status(400).json({
				message: 'Your shipping address is incomplete. Please update it before checkout.',
				code: 'INCOMPLETE_ADDRESS'
			});
		}

		// 3. Prepare cart items array (single product for buy now)
		const cartItems = [product];
		const shippingOptions = { [productId]: shippingType };

		// 4. Calculate total
		const computeTotal = (items, shippingOpts) => {
			let total = 0;
			for (const it of items) {
				const qty = Number(it.Quantity || 0);
				const unit = Number(it.Price || 0);
				const shipType = shippingOpts?.[it.ProductId] || 'standard';
				const shipPrice =
					shipType === 'express'
						? Number(it.ExpressShippingPrice || it.ShippingPrice || 0)
						: Number(it.ShippingPrice || 0);
				const itemTotal = qty * unit + shipPrice;
				total += itemTotal;
			}
			return Number(total.toFixed(2));
		};

		const draftId = v4();
		const totalAmount = computeTotal(cartItems, shippingOptions);

		// 5. Create checkout draft
		const CartItemsJson = JSON.stringify(cartItems);
		const ShippingOptionsJson = JSON.stringify(shippingOptions);
		const ShippingAddressJson = JSON.stringify({
			default: shippingAddress,
			perItem: {},
		});

		await db.executeProcedure('CreateCheckoutDraft', {
			DraftId: draftId,
			BuyerId: userId,
			CartItemsJson,
			ShippingOptionsJson,
			ShippingAddressJson,
			TotalAmount: totalAmount,
			SessionId: null,
		});

		// 6. Create Stripe session
		const lineItems = cartItems.map((item) => {
			const shipType = shippingOptions[item.ProductId];
			const shippingFee = shipType === 'express' ? item.ExpressShippingPrice : item.ShippingPrice;
			const totalPrice = shipType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;

			const descriptionParts = [];
			if (item.SellerName) descriptionParts.push(`Sold by: ${item.SellerName}`);
			descriptionParts.push(`${shipType === 'express' ? 'Express' : 'Standard'} shipping: €${Number(shippingFee).toFixed(2)}`);
			descriptionParts.push(`Unit price: €${Number(item.Price).toFixed(2)}`);

			return {
				price_data: {
					currency: 'eur',
					product_data: {
						name: item.ProductName,
						description: descriptionParts.join(' · '),
						images: item.ProductImageUrl ? [item.ProductImageUrl] : [],
					},
					unit_amount: Math.round(totalPrice * 100),
				},
				quantity: item.Quantity,
			};
		});

		// Add processing fee
		const subtotalCentsBN = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
		const feeCentsBN = calcProcessingFeeCents(subtotalCentsBN);
		const lineItemsWithFeeBN = [
			...lineItems,
			{
				price_data: {
					currency: 'eur',
					product_data: { name: 'Processing fee' },
					unit_amount: feeCentsBN,
				},
				quantity: 1,
			},
		];

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card', 'sepa_debit'],
			mode: 'payment',
			line_items: lineItemsWithFeeBN,
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.FRONTEND_URL}/payment/fail`,
			metadata: {
				userId: userId,
				checkoutDraftId: draftId,
				shippingAddressId: shippingAddress.ShippingId,
				isBuyNow: 'true',
			},
		});

		await db.executeProcedure('InsertSessionIdToDraft', { DraftId: draftId, SessionId: session.id });

		return res.json({
			url: session.url,
			draftId,
			totalAmount
		});
	} catch (err) {
		console.error('Buy Now error:', err);
		res.status(500).json({ message: 'Failed to process buy now request.' });
	}
});

// POST /checkout/draft
checkoutRouter.post('/draft', authenticateToken, async (req, res) => {
	const { cartItems, shippingOptions, shippingAddress } = req.body;
	const BuyerId = req.user.id;

	if (!Array.isArray(cartItems) || cartItems.length === 0 || !shippingOptions || !shippingAddress) {
		console.log('Missing cart, shipping, or address details.');
		return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
	}

	try {
		// ── Stock validation: verify every item has sufficient stock before creating a Stripe session ──
		for (const item of cartItems) {
			const productResult = await db.executeProcedure('GetProductForCheckout', {
				ProductId: item.ProductId,
				UserId: BuyerId,
				Quantity: item.Quantity,
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
					message: `Only ${product.InStock} unit${product.InStock !== 1 ? 's' : ''} of "${item.ProductName}" are available. Please update your cart and try again.`,
					code: 'INSUFFICIENT_STOCK',
					productId: item.ProductId,
					available: product.InStock,
				});
			}
		}

		// Basic server-side validation and total calculation
		const computeTotal = (items, shippingOpts) => {
			let total = 0;
			for (const it of items) {
				const qty = Number(it.Quantity || 0);
				const unit = Number(it.Price || 0);
				// pick shipping price according to shippingOptions map or default to ShippingPrice
				const shipType = shippingOpts?.[it.ProductId] || 'standard';
				const shipPrice =
					shipType === 'express'
						? Number(it.ExpressShippingPrice || it.ShippingPrice || 0)
						: Number(it.ShippingPrice || 0);
				const itemTotal = qty * unit + shipPrice;
				total += itemTotal;
			}
			return Number(total.toFixed(2));
		};

		const draftId = v4();
		const totalAmount = computeTotal(cartItems, shippingOptions);

		// stringify JSON payloads before sending to DB
		// shippingAddress can be either old format (single object) or new format ({ default, perItem })
		const CartItemsJson = JSON.stringify(cartItems);
		const ShippingOptionsJson = JSON.stringify(shippingOptions);
		const ShippingAddressJson = JSON.stringify(shippingAddress);

		// call stored proc
		await db.executeProcedure('CreateCheckoutDraft', {
			DraftId: draftId,
			BuyerId,
			CartItemsJson,
			ShippingOptionsJson,
			ShippingAddressJson,
			TotalAmount: totalAmount,
			SessionId: null,
		});

		// respond with draftId
		return res.status(201).json({ draftId, totalAmount });
	} catch (error) {
		console.error('Something went wrong while creating the draft', error);
		return res.status(500).json({ message: 'Failed to create checkout draft.' });
	}
});

export const stripeWebhook = async (req, res) => {
	const sig = req.headers['stripe-signature'];

	let event;
	try {
		event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('⚠️ Webhook signature verification failed.', err.message);
		return res.sendStatus(400);
	}

	// ── Subscription: checkout completed ──
	if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
		await handleSubscriptionCheckoutComplete(event.data.object);
		return res.status(200).end();
	}

	// ── Subscription: invoice paid (renewal) ──
	if (event.type === 'invoice.paid') {
		await handleInvoicePaid(event.data.object);
		return res.status(200).end();
	}

	// ── Subscription: payment failed ──
	if (event.type === 'invoice.payment_failed') {
		await handlePaymentFailed(event.data.object);
		return res.status(200).end();
	}

	// ── Subscription: deleted / expired ──
	if (event.type === 'customer.subscription.deleted') {
		await handleSubscriptionDeleted(event.data.object);
		return res.status(200).end();
	}

	// ── Subscription: updated (e.g. cancel_at_period_end toggled) ──
	if (event.type === 'customer.subscription.updated') {
		await handleSubscriptionUpdated(event.data.object);
		return res.status(200).end();
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;

		try {
			console.log('🧾 The WebHook received Metadata:', session.metadata);

			const draftId = session.metadata.checkoutDraftId;
			const userId = session.metadata.userId;

			console.log('Looking for draft in DB with ID:', draftId);
			const draftResult = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });

			// Access properly depending on your DB helper structure
			const draftRow = draftResult?.recordset?.[0];

			if (!draftRow) {
				console.error(`❌ No checkout draft found for ID: ${draftId}`);
				return res.status(404).send('Draft not found');
			}

			console.log('✅ Found checkout draft in DB:', draftRow.DraftId);

			// Parse draft data
			const cartItems = JSON.parse(draftRow.CartItemsJson);
			const shippingOptions = JSON.parse(draftRow.ShippingOptionsJson);
			const shippingAddressRaw = JSON.parse(draftRow.ShippingAddressJson);

			// Parse address format (handles both old single-object and new {default, perItem})
			const { defaultAddress, perItem } = parseShippingAddress(shippingAddressRaw);

			// ✅ Group items by SellerId + ShippingAddressId
			// Items going to different addresses from the same seller get separate orders
			const groupKey = (item) => {
				const itemAddr = getAddressForItem(item, defaultAddress, perItem);
				const addrId = itemAddr?.ShippingId || 'default';
				return `${item.SellerId}__${addrId}`;
			};

			const groupedBySellerAndAddress = cartItems.reduce((acc, item) => {
				const key = groupKey(item);
				if (!acc[key]) acc[key] = [];
				acc[key].push(item);
				return acc;
			}, {});

			// Loop seller+address groups and insert orders
			for (const [key, items] of Object.entries(groupedBySellerAndAddress)) {
				const sellerId = items[0].SellerId;
				const orderAddress = getAddressForItem(items[0], defaultAddress, perItem);
				const orderShippingId = orderAddress?.ShippingId || session.metadata.shippingAddressId;

				const sellerOrderTotal = items.reduce((sum, i) => {
					const shipType = shippingOptions?.[i.ProductId] || 'standard';
					const totalPrice = shipType === 'express' ? (i.ExpressTotalPrice || i.TotalPrice) : i.TotalPrice;
					return sum + totalPrice;
				}, 0);

				const newOrderId = uuidv4();
				await db.executeProcedure('CreateOrder', {
					OrderId: newOrderId,
					BuyerId: userId,
					SellerId: sellerId,
					ShippingId: orderShippingId,
					TotalAmount: sellerOrderTotal,
					PaymentIntentId: session.payment_intent,
					DeliveryStatus: 'Processing',
					CartItemsJson: JSON.stringify(items),
				});

				// ── Record commission in ledger ──
				try {
					const commResult = await db.executeProcedure('GetSellerCommissionRate', { SellerId: sellerId });
					const commissionRate = commResult.recordset?.[0]?.CommissionRate ?? 0.05;
					const subscriptionId = commResult.recordset?.[0]?.SubscriptionId ?? null;
					const commissionAmount = Number((sellerOrderTotal * commissionRate).toFixed(2));
					const netAmount = Number((sellerOrderTotal - commissionAmount).toFixed(2));

					await db.executeProcedure('RecordCommission', {
						OrderId: newOrderId,
						SellerId: sellerId,
						SubscriptionId: subscriptionId,
						GrossAmount: sellerOrderTotal,
						CommissionRate: commissionRate,
						CommissionAmount: commissionAmount,
						NetAmount: netAmount,
					});
				} catch (commErr) {
					// Non-critical: log but don't fail the order
					console.error('⚠️ Failed to record commission for order', newOrderId, commErr.message);
				}

				const seller = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
				const sellerDetails = seller.recordset[0];

				// Send seller notification with the specific order address
				await sendSellerOrderNotificationEmail(
					sellerDetails.Email,
					sellerDetails.BusinessName,
					items,
					shippingOptions,
					orderAddress,
					sellerOrderTotal
				);
			}

			await db.executeProcedure('MarkCheckoutDraftAsUsed', { DraftId: draftId });
			res.status(200).send('✅ Orders inserted successfully');

			await db.executeProcedure('ClearUserCart', { UserId: userId });
			const buyer = await db.executeProcedure('GetUserById', { UserId: userId });
			const buyerDetails = buyer.recordset[0];

			// Send buyer confirmation with shipping options
			await sendBuyerOrderConfirmationEmail(
				buyerDetails.Email,
				buyerDetails.Username,
				cartItems,
				draftRow.TotalAmount,
				shippingOptions
			);
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

/**
 * checkout.session.completed with mode='subscription'
 * Creates the SellerSubscription record and records the first payment.
 */
async function handleSubscriptionCheckoutComplete(session) {
	try {
		const { sellerId, planId, planCode } = session.metadata || {};
		if (!sellerId || !planId) {
			console.error('⚠️ Subscription checkout missing metadata:', session.metadata);
			return;
		}

		// Fetch the full Stripe subscription object to get period dates
		const stripeSubId = typeof session.subscription === 'string'
			? session.subscription
			: session.subscription?.id;
		const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

		// Idempotency check — the success page's activate-session endpoint may have already
		// created this record. Skip if so to avoid duplicates.
		const existingCheck = await db.executeProcedure('GetSubscriptionByStripeSubId', {
			StripeSubscriptionId: stripeSub.id,
		});
		if (existingCheck.recordset?.length) {
			console.log(`ℹ️ Webhook: subscription ${stripeSub.id} already activated — skipping.`);
			return;
		}

		const currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
		const currentPeriodEnd   = new Date(stripeSub.current_period_end   * 1000);

		// Determine status — if trial_end is set, it's pending_trial
		const status = stripeSub.status === 'trialing' ? 'pending_trial' : 'active';

		// Create the subscription record
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

		// Deactivate the previous free plan record for this seller
		// (get all active free plans and expire them)
		await db.executeProcedure('ExpireStaleSubscriptions', {});

		// Save Stripe customer ID to the Sellers table.
		// May fail if the user hasn't created their seller account yet (pre-registration flow) — that's fine.
		if (session.customer) {
			try {
				await db.executeProcedure('UpdateSellerStripeCustomerId', {
					SellerId: sellerId,
					StripeCustomerId: session.customer,
				});
			} catch (custErr) {
				console.warn('⚠️ Could not save StripeCustomerId to Sellers table (seller account may not exist yet):', custErr.message);
			}
		}

		// Record first payment if invoice is paid immediately (not a trial)
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

		// Send confirmation email — fall back to basic user profile if no seller account yet
		try {
			const [sellerResult, plansResult] = await Promise.all([
				db.executeProcedure('GetSellerDetails', { SellerId: sellerId }),
				db.executeProcedure('GetSubscriptionPlans', {}),
			]);
			const seller = sellerResult.recordset?.[0];
			const plan = plansResult.recordset.find((p) => p.PlanId === Number(planId));

			let emailTarget = seller
				? { email: seller.Email, name: seller.BusinessName }
				: null;

			if (!emailTarget) {
				const userResult = await db.executeProcedure('GetUserById', { UserId: sellerId });
				const user = userResult.recordset?.[0];
				if (user) emailTarget = { email: user.Email, name: user.Username };
			}

			if (emailTarget && plan) {
				await sendSubscriptionConfirmationEmail(
					emailTarget.email,
					emailTarget.name,
					plan.PlanName,
					plan.Price,
					plan.BillingCycle,
					currentPeriodEnd
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

/**
 * invoice.paid — subscription renewed successfully.
 * Updates period dates and records the payment.
 */
async function handleInvoicePaid(invoice) {
	try {
		const stripeSubId = invoice.subscription;
		if (!stripeSubId) return;

		// Use invoice line item periods — always populated and more reliable
		// than reading current_period_start from the subscription object at webhook time.
		const line = invoice.lines?.data?.[0];
		const currentPeriodStart = line?.period?.start
			? new Date(line.period.start * 1000)
			: new Date();
		const currentPeriodEnd = line?.period?.end
			? new Date(line.period.end * 1000)
			: null;

		// Update subscription period and reset reminder flags
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

		// Look up our DB row by Stripe subscription ID
		const lookupResult = await db.executeProcedure('GetSubscriptionByStripeSubId', {
			StripeSubscriptionId: stripeSubId,
		});
		const subRow = lookupResult?.recordset?.[0];
		if (!subRow) {
			// The activate-session endpoint hasn't run yet (e.g. user hasn't hit success page).
			// Payment will be recorded when activate-session runs.
			console.log(`ℹ️ handleInvoicePaid: no DB row for ${stripeSubId} yet — skipping payment record.`);
			return;
		}

		// Record the payment
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
			PaidAt:                invoice.status_transitions?.paid_at
				? new Date(invoice.status_transitions.paid_at * 1000)
				: new Date(),
		});

		console.log(`✅ Subscription renewed: ${stripeSubId}`);
	} catch (err) {
		console.error('❌ handleInvoicePaid error:', err);
	}
}

/**
 * invoice.payment_failed — marks subscription as payment_failed and emails seller.
 */
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
			if (seller) {
				await sendSubscriptionPaymentFailedEmail(seller.Email, seller.BusinessName, subRow.PlanName);
			}
		} catch (emailErr) {
			console.error('⚠️ Could not send payment failed email:', emailErr.message);
		}

		console.log(`⚠️ Payment failed for subscription: ${stripeSubId}`);
	} catch (err) {
		console.error('❌ handlePaymentFailed error:', err);
	}
}

/**
 * customer.subscription.deleted — subscription fully ended.
 * Marks our record as expired and sends email.
 */
async function handleSubscriptionDeleted(stripeSub) {
	try {
		const updateResult = await db.executeProcedure('UpdateSellerSubscriptionByStripeId', {
			StripeSubscriptionId: stripeSub.id,
			Status: 'expired',
		});

		const subRow = updateResult?.recordset?.[0];
		if (!subRow) return;

		// Ensure free plan fallback via cron logic
		await db.executeProcedure('ExpireStaleSubscriptions', {});

		try {
			const sellerResult = await db.executeProcedure('GetSellerDetails', { SellerId: subRow.SellerId });
			const seller = sellerResult.recordset?.[0];
			if (seller) {
				await sendSubscriptionExpiredEmail(seller.Email, seller.BusinessName, subRow.PlanName);
			}
		} catch (emailErr) {
			console.error('⚠️ Could not send expiry email:', emailErr.message);
		}

		console.log(`✅ Subscription expired: ${stripeSub.id}`);
	} catch (err) {
		console.error('❌ handleSubscriptionDeleted error:', err);
	}
}

/**
 * customer.subscription.updated — syncs cancel_at_period_end flag.
 */
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
