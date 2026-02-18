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

// GET single order by ID
orderRouter.get('/:orderId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { orderId } = req.params;

		const result = await db.executeProcedure('GetOrderById', {
			OrderId: orderId,
			UserId,
		});

		const order = result.recordset?.[0];
		if (!order) {
			return res.status(404).json({ success: false, message: 'Order not found.' });
		}

		return res.status(200).json({
			success: true,
			data: {
				...order,
				OrderItems: JSON.parse(order.OrderItems || '[]'),
				IsBuyer: order.BuyerId === UserId,
				IsSeller: order.SellerId === UserId,
			},
		});
	} catch (error) {
		console.error('Error fetching order details:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
	}
});

// Cancel an order (only if status is Processing)
orderRouter.post('/:orderId/cancel', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { orderId } = req.params;

		const result = await db.executeProcedure('CancelOrder', {
			OrderId: orderId,
			UserId,
		});

		const updated = result.recordset?.[0];
		if (!updated) {
			return res.status(400).json({ success: false, message: 'Failed to cancel order.' });
		}

		return res.status(200).json({
			success: true,
			message: 'Order cancelled successfully. Stock has been restored.',
			data: updated,
		});
	} catch (error) {
		console.error('Error cancelling order:', error);
		const message = error.message || 'Failed to cancel order.';
		return res.status(400).json({ success: false, message });
	}
});

// Update order status (seller only: accept, reject, ship, deliver)
orderRouter.patch('/:orderId/status', authenticateToken, async (req, res) => {
	try {
		const SellerId = req.user.id;
		const { orderId } = req.params;
		const { status } = req.body;

		if (!status) {
			return res.status(400).json({ success: false, message: 'Status is required.' });
		}

		const result = await db.executeProcedure('UpdateOrderStatus', {
			OrderId: orderId,
			SellerId,
			NewStatus: status,
		});

		const updated = result.recordset?.[0];
		if (!updated) {
			return res.status(400).json({ success: false, message: 'Failed to update order status.' });
		}

		const messages = {
			Confirmed: 'Order accepted successfully.',
			Rejected: 'Order rejected. Stock has been restored.',
			Shipped: 'Order marked as shipped.',
			Delivered: 'Order marked as delivered.',
			Sold: 'Order marked as sold.',
		};

		return res.status(200).json({
			success: true,
			message: messages[status] || 'Order status updated.',
			data: updated,
		});
	} catch (error) {
		console.error('Error updating order status:', error);
		const message = error.message || 'Failed to update order status.';
		return res.status(400).json({ success: false, message });
	}
});

export default orderRouter;
