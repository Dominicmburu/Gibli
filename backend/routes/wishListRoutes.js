import express from 'express';
import DbHelper from '../db/dbHelper.js';
import { v4 } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const db = new DbHelper();

const wishlistRouter = express.Router();

wishlistRouter.post('/add-to-wishlist', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { ProductId } = req.body;
		const WishListItemId = v4();
		await db.executeProcedure('AddToWishList', {
			WishListItemId,
			UserId,
			ProductId,
		});

		res.status(201).json({ message: 'Product added to wishlist' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to add to wishlist', error: err.message });
	}
});
wishlistRouter.get('/items', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		const result = await db.executeProcedure('GetUserWishList', { UserId });

		const wishlistItems = result?.recordset || [];
		res.status(200).json(wishlistItems);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch wishlistItems', error: err.message });
	}
});

// Remove item from wishlist
wishlistRouter.delete('/remove/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;

		await db.executeProcedure('RemoveItem', {
			WishListItemId: id,
		});

		res.status(200).json({ message: 'wishlist item removed' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to remove item', error: err.message });
	}
});
// Quick-Remove item from wishlist from the heart icon in product card
wishlistRouter.delete('/quick-remove/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		const UserId = req.user.id;

		await db.executeProcedure('QuickRemoveProductFromWishlist', {
			ProductId: id,
			UserId,
		});

		res.status(200).json({ message: 'item removed from wishlist' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to remove item', error: err.message });
	}
});

// Clear entire wishlist
wishlistRouter.delete('/clear', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		await db.executeProcedure('ClearUserWishList', { UserId });

		res.status(200).json({ message: 'wishlist cleared' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to clear wishlist', error: err.message });
	}
});

export default wishlistRouter;
