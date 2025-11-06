import express from 'express';
import { v4 as uid } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';

const orderRouter = express.Router();
const db = new DbHelper();

orderRouter.post('/placed', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		const result = await db.executeProcedure('GetUserOrders', {
			UserId,
			Role: 'Buyer',
		});
		const orders = result.recordset;
		const formattedOrders = orders.map((order) => ({
			...order,
			OrderItems: JSON.parse(order.OrderItems || '[]'),
		}));
		return res.status(200).json({
			success: true,
			message: 'Fetched all orders placed by user',
			data: formattedOrders,
		});
	} catch (error) {
		console.error('Error fetching placed orders:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal server error while fetching placed orders',
		});
	}
});
orderRouter.post('/received', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;

		const result = await db.executeProcedure('GetUserOrders', {
			UserId,
			Role: 'Seller',
		});
		const orders = result.recordset;
		const formattedOrders = orders.map((order) => ({
			...order,
			OrderItems: JSON.parse(order.OrderItems || '[]'),
		}));
		return res.status(200).json({
			success: true,
			message: 'Fetched all orders received by seller',
			data: formattedOrders,
		});
	} catch (error) {
		console.error('Error fetching received orders:', error);
		return res.status(500).json({
			success: false,
			message: 'Internal server error while fetching received orders',
		});
	}
});

export default orderRouter;
