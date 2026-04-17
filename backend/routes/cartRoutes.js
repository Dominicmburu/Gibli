// routes/cartRouter.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { sendRestockNotificationEmail } from '../services/emailService.js';

const cartRouter = express.Router();
const db = new DbHelper();

// Add to cart
cartRouter.post('/additem', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { ProductId } = req.body;
		const CartItemId = uuidv4();

		// Check current product stock and how many the user already has in their cart
		const stockCheck = await db.executeProcedure('CheckAddToCartStock', { ProductId, UserId });
		const productInfo = stockCheck.recordset?.[0];
		if (!productInfo) {
			return res.status(404).json({ message: 'Product not found.' });
		}
		if (productInfo.InStock <= 0) {
			return res.status(400).json({ message: `"${productInfo.ProductName}" is out of stock.`, code: 'OUT_OF_STOCK' });
		}
		if (productInfo.CartQty >= productInfo.InStock) {
			return res.status(400).json({
				message: `You already have the maximum available quantity (${productInfo.InStock}) of "${productInfo.ProductName}" in your cart.`,
				code: 'INSUFFICIENT_STOCK',
				available: productInfo.InStock,
			});
		}

		await db.executeProcedure('AddToCart', {
			CartItemId,
			UserId,
			ProductId,
		});

		res.status(201).json({ message: 'Product added to cart' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to add to cart', error: err.message });
	}
});

// Get cart items for logged-in user
cartRouter.get('/items', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		if (!UserId) {
			return res.status(200).json([]);
		}

		const result = await db.executeProcedure('GetUserCart', { UserId });

		const cartItems = result?.recordset || [];
		res.status(200).json(cartItems);
	} catch (err) {
		console.error('Cart fetch error:', err);
		res.status(500).json({ message: 'Failed to fetch cart', error: err.message });
	}
});

cartRouter.put('/increment', authenticateToken, async (req, res) => {
	const { ProductId } = req.body;
	const UserId = req.user.id;

	try {
		await db.executeProcedure('IncrementCartItemQuantity', { UserId, ProductId });
		res.status(200).json({ message: 'Quantity increased' });
	} catch (err) {
		console.error('Increment error:', err);
		res.status(500).json({ message: 'Failed to increase quantity' });
	}
});

cartRouter.put('/decrement', authenticateToken, async (req, res) => {
	const { ProductId } = req.body;
	const UserId = req.user.id;

	try {
		await db.executeProcedure('DecrementCartItemQuantity', { UserId, ProductId });
		res.status(200).json({ message: 'Quantity decreased ' });
	} catch (err) {
		console.error('Decrement error:', err);
		res.status(500).json({ message: 'Failed to decrease quantity' });
	}
});

// Update quantity of a cart item
cartRouter.put('/update/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		const { Quantity } = req.body;

		// Validate the new quantity does not exceed available stock
		const stockCheck = await db.executeProcedure('GetCartItemStockByCartItemId', { CartItemId: id });
		const productInfo = stockCheck.recordset?.[0];
		if (productInfo && Quantity > productInfo.InStock) {
			return res.status(400).json({
				message: `Only ${productInfo.InStock} unit${productInfo.InStock !== 1 ? 's' : ''} of "${productInfo.ProductName}" are available.`,
				code: 'INSUFFICIENT_STOCK',
				available: productInfo.InStock,
			});
		}

		await db.executeProcedure('UpdateCartItem', {
			CartItemId: id,
			Quantity,
		});

		res.status(200).json({ message: 'Cart item updated' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to update item', error: err.message });
	}
});

// Remove item from cart
cartRouter.delete('/remove/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;

		await db.executeProcedure('RemoveCartItem', {
			CartItemId: id,
		});

		res.status(200).json({ message: 'Cart item removed' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to remove item', error: err.message });
	}
});

// Set restock reminder for a product
cartRouter.post('/restock-reminder/:productId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { productId } = req.params;

		// Get user email
		const userResult = await db.executeProcedure('GetUserById', { UserId });
		const user = userResult.recordset?.[0];
		if (!user) return res.status(404).json({ message: 'User not found.' });

		const result = await db.executeProcedure('UpsertRestockReminder', {
			ReminderId: uuidv4(),
			ProductId: productId,
			UserId,
			Email: user.Email,
		});

		res.status(201).json({ message: 'You will be notified when this product is back in stock.', data: result.recordset?.[0] });
	} catch (err) {
		res.status(500).json({ message: 'Failed to set reminder', error: err.message });
	}
});

// Cancel restock reminder
cartRouter.delete('/restock-reminder/:productId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { productId } = req.params;
		await db.executeProcedure('DeleteRestockReminder', { ProductId: productId, UserId });
		res.status(200).json({ message: 'Restock reminder cancelled.' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to cancel reminder', error: err.message });
	}
});

// Check if user has a restock reminder for a product
cartRouter.get('/restock-reminder/:productId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { productId } = req.params;
		const result = await db.executeProcedure('GetUserRestockReminder', { ProductId: productId, UserId });
		res.status(200).json({ hasReminder: (result.recordset?.length ?? 0) > 0 });
	} catch (err) {
		res.status(500).json({ message: 'Failed to check reminder', error: err.message });
	}
});

// Clear entire cart
cartRouter.delete('/clear', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		await db.executeProcedure('ClearUserCart', { UserId });

		res.status(200).json({ message: 'Cart cleared' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to clear cart', error: err.message });
	}
});

export default cartRouter;
