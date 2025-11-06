import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4, v4 } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendBuyerOrderConfirmationEmail, sendSellerOrderNotificationEmail } from '../services/emailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new DbHelper();
const checkoutRouter = express.Router();
const stripe = new Stripe(process.env.SK_TEST);

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
	const shippingAddress = JSON.parse(draft.ShippingAddressJson);

	if (!cartItems?.length || !shippingOptions || !shippingAddress) {
		console.log('Missing cart, shipping, or address details.');
		return res.status(400).json({ message: 'Missing cart, shipping, or address details.' });
	}

	try {
		// 🧮 Compute line items
		const lineItems = cartItems.map((item) => {
			const shippingType = shippingOptions[item.ProductId];
			const shippingFee = shippingType === 'express' ? item.ExpressShippingPrice : item.ShippingPrice;

			const totalPrice = shippingType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;

			return {
				price_data: {
					currency: 'eur',
					product_data: {
						name: item.ProductName,
						images: [item.ProductImageUrl],
					},
					unit_amount: Math.round(totalPrice * 100), // Stripe uses cents
				},
				quantity: item.Quantity,
			};
		});

		// 💳 Create Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card', 'sepa_debit'],
			mode: 'payment',
			line_items: lineItems,
			// success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
			// cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
			success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.FRONTEND_URL}/payment/fail`,
			metadata: {
				userId: cartItems[0].UserId,
				checkoutDraftId: draftId,
				shippingDetails: JSON.stringify(shippingOptions),
				shippingAddressId: shippingAddress.ShippingId,
			}, //Infuture you can pass the amount total for amount computation and tracking
		});

		await db.executeProcedure('InsertSessionIdToDraft', { DraftId: draftId, SessionId: session.id });
		return res.json({ url: session.url });
	} catch (err) {
		console.error('Error creating checkout session:', err);
		res.status(500).json({ message: 'Failed to create checkout session.' });
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
		const CartItemsJson = JSON.stringify(cartItems);
		const ShippingOptionsJson = JSON.stringify(shippingOptions);
		const ShippingAddressJson = JSON.stringify(shippingAddress);

		// call stored proc (adjust to your db helper signature)
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

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;

		try {
			console.log('🧾 The WebHook received Metadata:', session.metadata);

			const draftId = session.metadata.checkoutDraftId;
			const userId = session.metadata.userId;
			const shippingId = session.metadata.shippingAddressId;

			console.log('Looking for draft in DB with ID:', draftId);
			const draftResult = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });

			// Access properly depending on your DB helper structure
			const draftRow = draftResult?.recordset?.[0];

			if (!draftRow) {
				console.error(`❌ No checkout draft found for ID: ${draftId}`);
				return res.status(404).send('Draft not found');
			}

			console.log('✅ Found checkout draft in DB:', draftRow.DraftId);

			// Corrected property names
			const cartItems = JSON.parse(draftRow.CartItemsJson);
			const shippingOptions = JSON.parse(draftRow.ShippingOptionsJson);
			const shippingAddress = JSON.parse(draftRow.ShippingAddressJson);

			// Parse metadata
			// const shippingId = session.metadata.shippingAddressId;
			// const shippingOptions = JSON.parse(session.metadata.shippingDetails);

			// ✅ Group items by SellerId
			const groupedBySeller = cartItems.reduce((acc, item) => {
				if (!acc[item.SellerId]) acc[item.SellerId] = [];
				acc[item.SellerId].push(item);
				return acc;
			}, {});

			// Loop sellers and insert orders
			for (const [sellerId, items] of Object.entries(groupedBySeller)) {
				await db.executeProcedure('CreateOrder', {
					OrderId: uuidv4(),
					BuyerId: userId,
					SellerId: sellerId,
					ShippingId: shippingId,
					TotalAmount: items.reduce((sum, i) => sum + i.TotalPrice, 0),
					PaymentIntentId: session.payment_intent,
					DeliveryStatus: 'Processing',
					CartItemsJson: JSON.stringify(items),
				});
				const seller = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
				const sellerDetails = seller.recordset[0];
				await sendSellerOrderNotificationEmail(sellerDetails.Email, sellerDetails.BusinessName, cartItems);
			}

			await db.executeProcedure('MarkCheckoutDraftAsUsed', { DraftId: draftId });
			res.status(200).send('✅ Orders inserted successfully');

			await db.executeProcedure('ClearUserCart', { UserId: userId });
			const buyer = await db.executeProcedure('GetUserById', { UserId: userId });
			const buyerDetails = buyer.recordset[0];
			await sendBuyerOrderConfirmationEmail(
				buyerDetails.Email,
				buyerDetails.Username,
				cartItems,
				draftRow.TotalAmount
			);
		} catch (err) {
			console.error('❌ Error processing webhook:', err);
			res.status(500).send('Webhook processing failed');
		}
	} else {
		res.status(200).end();
	}
};
//===============USE THIS IF THE EXPORT ONE FAILS
// checkoutRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
// 	const sig = req.headers['stripe-signature'];

// 	let event;
// 	try {
// 		event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
// 	} catch (err) {
// 		console.error('⚠️ Webhook signature verification failed.', err.message);
// 		return res.sendStatus(400);
// 	}

// 	if (event.type === 'checkout.session.completed') {
// 		const session = event.data.object;

// 		try {
// 			// Parse metadata
// 			const userId = session.metadata.userId;
// 			const shippingId = session.metadata.shippingAddressId;
// 			const shippingOptions = JSON.parse(session.metadata.shippingDetails);
// 			const cartItems = JSON.parse(session.metadata.cartItems); // You’ll stringify these at session creation

// 			// ✅ Group items by SellerId
// 			const groupedBySeller = cartItems.reduce((acc, item) => {
// 				if (!acc[item.SellerId]) acc[item.SellerId] = [];
// 				acc[item.SellerId].push(item);
// 				return acc;
// 			}, {});

// 			// Loop sellers and insert orders
// 			for (const [sellerId, items] of Object.entries(groupedBySeller)) {
// 				await db.executeStoredProcedure('sp_CreateOrder', {
// 					OrderId: uuidv4(),
// 					BuyerId: userId,
// 					SellerId: sellerId,
// 					ShippingId: shippingId,
// 					TotalAmount: items.reduce((sum, i) => sum + i.TotalPrice, 0),
// 					PaymentIntentId: session.payment_intent,
// 					DeliveryStatus: 'Processing',
// 					CartItemsJson: JSON.stringify(items),
// 				});
// 			}

// 			res.status(200).send('✅ Orders inserted successfully');
// 		} catch (err) {
// 			console.error('❌ Error processing webhook:', err);
// 			res.status(500).send('Webhook processing failed');
// 		}
// 	} else {
// 		res.status(200).end();
// 	}
// });
// ---------THIS IS THE DRY WEBHOOK ROUTE WITH NO WHSEC AS WELL.
// checkoutRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
// 	const sig = req.headers['stripe-signature'];

// 	let event;
// 	try {
// 		// If you don’t have webhook secret yet, skip verification during local testing
// 		event = req.body;
// 	} catch (err) {
// 		console.error('⚠️ Webhook signature verification failed.', err.message);
// 		return res.sendStatus(400);
// 	}

// 	if (event.type === 'checkout.session.completed') {
// 		const session = event.data.object;

// 		try {
// 			// Parse metadata
// 			const userId = session.metadata.userId;
// 			const shippingId = session.metadata.shippingAddressId;
// 			const shippingOptions = JSON.parse(session.metadata.shippingDetails);
// 			const cartItems = JSON.parse(session.metadata.cartItems); // You’ll stringify these at session creation

// 			// ✅ Group items by SellerId
// 			const groupedBySeller = cartItems.reduce((acc, item) => {
// 				if (!acc[item.SellerId]) acc[item.SellerId] = [];
// 				acc[item.SellerId].push(item);
// 				return acc;
// 			}, {});

// 			// Loop sellers and insert orders
// 			for (const [sellerId, items] of Object.entries(groupedBySeller)) {
// 				await db.executeStoredProcedure('sp_CreateOrder', {
// 					OrderId: uuidv4(),
// 					BuyerId: userId,
// 					SellerId: sellerId,
// 					ShippingId: shippingId,
// 					TotalAmount: items.reduce((sum, i) => sum + i.TotalPrice, 0),
// 					PaymentIntentId: session.payment_intent,
// 					DeliveryStatus: 'Processing',
// 					CartItemsJson: JSON.stringify(items),
// 				});
// 			}

// 			res.status(200).send('✅ Orders inserted successfully');
// 		} catch (err) {
// 			console.error('❌ Error processing webhook:', err);
// 			res.status(500).send('Webhook processing failed');
// 		}
// 	} else {
// 		res.status(200).end();
// 	}
// });

//-----THIS VERSION HAS VERIFICATION OF WEBHOOK SECRET-------
// export const stripeWebhook = async (req, res) => {
// 	const sig = req.headers['stripe-signature'];

// 	let event;

// 	try {
// 		// ✅ Verify the event came from Stripe
// 		event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
// 	} catch (err) {
// 		console.error('⚠️ Webhook signature verification failed:', err.message);
// 		return res.status(400).send(`Webhook Error: ${err.message}`);
// 	}

// 	// 🎯 Handle successful checkout
// 	if (event.type === 'checkout.session.completed') {
// 		const session = event.data.object;
// 		const metadata = session.metadata || {};
// 		const userId = metadata.userId;
// 		const shippingAddressId = metadata.shippingAddressId;
// 		const shippingDetails = JSON.parse(metadata.shippingDetails || '{}');
// 		const paymentIntentId = session.payment_intent;
// 		const totalAmount = session.amount_total / 100;

// 		try {
// 			// --- 1️⃣ Create Order Record ---
// 			const orderId = uuidv4();

// 			await db.exec('spCreateOrder', {
// 				OrderId: orderId,
// 				BuyerId: userId,
// 				ShippingAddressId: shippingAddressId,
// 				PaymentIntentId: paymentIntentId,
// 				TotalAmount: totalAmount,
// 				Status: 'paid',
// 			});

// 			// --- 2️⃣ Insert Order Items ---
// 			// If you stored items in metadata (recommended later)
// 			// Here we’ll assume you'll add that field later
// 			console.log(`✅ Order created for user ${userId}:`, orderId);

// 			// --- 3️⃣ Placeholder for Emails ---
// 			console.log(`📧 Send confirmation email to Buyer (${userId})`);
// 			console.log(`📧 Send notification email to Seller(s)`);

// 			// --- 4️⃣ Respond to Stripe ---
// 			res.status(200).json({ received: true });
// 		} catch (dbError) {
// 			console.error('❌ Database error while processing order:', dbError);
// 			return res.status(500).json({ error: 'Failed to record order.' });
// 		}
// 	} else {
// 		// For other event types (ignored for now)
// 		res.status(200).send('Unhandled event type');
// 	}
// };

//-----THIS IS THE NO WEBHOOK SECRET VERSION -------
// export const stripeWebhook = async (req, res) => {
// 	const sig = req.headers['stripe-signature'];

// 	let event;
// 	try {
// 		// If you don’t have webhook secret yet, skip verification during local testing
// 		event = req.body;
// 	} catch (err) {
// 		console.error('⚠️ Webhook signature verification failed.', err.message);
// 		return res.sendStatus(400);
// 	}

// 	if (event.type === 'checkout.session.completed') {
// 		const session = event.data.object;

// 		try {
// 			// Parse metadata
// 			const userId = session.metadata.userId;
// 			const shippingId = session.metadata.shippingAddressId;
// 			const shippingOptions = JSON.parse(session.metadata.shippingDetails);
// 			const cartItems = JSON.parse(session.metadata.cartItems); // You’ll stringify these at session creation

// 			// ✅ Group items by SellerId
// 			const groupedBySeller = cartItems.reduce((acc, item) => {
// 				if (!acc[item.SellerId]) acc[item.SellerId] = [];
// 				acc[item.SellerId].push(item);
// 				return acc;
// 			}, {});

// 			// Loop sellers and insert orders
// 			for (const [sellerId, items] of Object.entries(groupedBySeller)) {
// 				await db.executeStoredProcedure('sp_CreateOrder', {
// 					OrderId: uuidv4(),
// 					BuyerId: userId,
// 					SellerId: sellerId,
// 					ShippingId: shippingId,
// 					TotalAmount: items.reduce((sum, i) => sum + i.TotalPrice, 0),
// 					PaymentIntentId: session.payment_intent,
// 					DeliveryStatus: 'Processing',
// 					CartItemsJson: JSON.stringify(items),
// 				});
// 			}

// 			res.status(200).send('✅ Orders inserted successfully');
// 		} catch (err) {
// 			console.error('❌ Error processing webhook:', err);
// 			res.status(500).send('Webhook processing failed');
// 		}
// 	} else {
// 		res.status(200).end();
// 	}
// };
export default checkoutRouter;
