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
			//payment_method_types: ['card', 'sepa_debit', 'giropay', 'paypal', 'revolut_pay'],
			payment_method_types: ['card', 'sepa_debit'],
			mode: 'payment',
			line_items: lineItems,
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
			const totalPrice = shipType === 'express' ? item.ExpressTotalPrice : item.TotalPrice;

			return {
				price_data: {
					currency: 'eur',
					product_data: {
						name: item.ProductName,
						images: item.ProductImageUrl ? [item.ProductImageUrl] : [],
					},
					unit_amount: Math.round(totalPrice * 100),
				},
				quantity: item.Quantity,
			};
		});

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card', 'sepa_debit'],
			mode: 'payment',
			line_items: lineItems,
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

				await db.executeProcedure('CreateOrder', {
					OrderId: uuidv4(),
					BuyerId: userId,
					SellerId: sellerId,
					ShippingId: orderShippingId,
					TotalAmount: sellerOrderTotal,
					PaymentIntentId: session.payment_intent,
					DeliveryStatus: 'Processing',
					CartItemsJson: JSON.stringify(items),
				});

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

export default checkoutRouter;
