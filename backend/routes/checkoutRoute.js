import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new DbHelper();
const checkoutRouter = express.Router();
const stripe = new Stripe(process.env.SK_TEST);

// 🛒 POST /checkout/proceed
checkoutRouter.post('/proceed', authenticateToken, async (req, res) => {
	try {
		const BuyerId = req.user.id;

		// Step 1: Fetch cart items for user
		const result = await db.executeProcedure('GetUserCart', { UserId: BuyerId });
		const cartItems = result.recordset;

		if (!cartItems || cartItems.length === 0) {
			return res.status(400).json({ message: 'No items in cart' });
		}

		// Step 2: Build Stripe-compatible line items
		const lineItems = [];
		let totalAmount = 0;

		for (const item of cartItems) {
			const unitPrice = Number(item.UnitPrice);
			const quantity = Number(item.Quantity);

			// Ensure valid values
			if (!item.ProductName || isNaN(unitPrice) || isNaN(quantity) || quantity < 1) {
				return res.status(400).json({ message: 'Invalid cart item data' });
			}

			lineItems.push({
				price_data: {
					currency: 'usd',
					product_data: {
						name: item.ProductName,
					},
					unit_amount: Math.round(unitPrice * 100), // in cents
				},
				quantity,
			});

			totalAmount += unitPrice * quantity;
		}

		// Step 3: Create order ID
		const orderId = uuidv4();

		// Step 4: Create Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: lineItems,
			mode: 'payment',
			success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `http://localhost:5173/cart`,
		});

		// Step 5: Prepare order items for DB
		const orderItemsTVP = cartItems.map((item) => ({
			OrderItemId: uuidv4(),
			OrderId: orderId,
			ProductId: item.ProductId,
			Quantity: Number(item.Quantity),
			UnitPrice: Number(item.UnitPrice),
			ItemTotal: Number(item.UnitPrice) * Number(item.Quantity),
			Status: 'pending',
		}));

		// Step 6: Insert order and items
		await db.executeProcedure('InsertOrderWithItems', {
			OrderId: orderId,
			BuyerId,
			OrderDate: new Date().toISOString(),
			TotalAmount: totalAmount,
			Items: {
				type: 'OrderItemType',
				value: orderItemsTVP,
			},
		});

		// Step 7: Clear the cart
		await db.executeProcedure('ClearUserCart', { UserId: BuyerId });

		// Step 8: Send Stripe session URL
		res.status(200).json({ url: session.url });
	} catch (error) {
		console.error('Checkout error:', error);
		res.status(500).json({ message: 'Checkout failed', error: error.message });
	}
});

export default checkoutRouter;
