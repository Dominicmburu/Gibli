import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import { sendOrderStatusUpdateEmail } from '../services/emailService.js';
import {
	ensureOrderReturnSchema,
	fetchOrderRefundFields,
	fetchLatestReturnRequest,
	setOrderDeliveredTimestamp,
} from '../services/orderReturnSupport.js';

const orderRouter = express.Router();
const db = new DbHelper();
const stripe = new Stripe(process.env.SK_TEST);

orderRouter.post('/placed', authenticateToken, async (req, res) => {
	try {
		await ensureOrderReturnSchema();
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
		await ensureOrderReturnSchema();
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

// GET count of new (Processing) orders for the logged-in seller
orderRouter.get('/new-count', authenticateToken, async (req, res) => {
	try {
		const result = await db.executeProcedure('GetNewOrderCount', { SellerId: req.user.id });
		const count = result.recordset?.[0]?.NewOrderCount ?? 0;
		return res.status(200).json({ count });
	} catch (error) {
		console.error('Error fetching new order count:', error);
		return res.status(500).json({ count: 0 });
	}
});

// GET seller payouts  ← must be before /:orderId
orderRouter.get('/payouts', authenticateToken, async (req, res) => {
	try {
		const SellerId = req.user.id;
		const result = await db.executeProcedure('GetSellerPayouts', { SellerId });
		return res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Error fetching seller payouts:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch payouts.' });
	}
});

// GET commission refund requests  ← must be before /:orderId
orderRouter.get('/commission-refunds', authenticateToken, async (req, res) => {
	try {
		const SellerId = req.user.id;
		const result = await db.executeProcedure('GetCommissionRefundRequests', { SellerId });
		return res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Error fetching commission refund requests:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch commission refund requests.' });
	}
});

// GET single order by ID
orderRouter.get('/:orderId', authenticateToken, async (req, res) => {
	try {
		await ensureOrderReturnSchema();
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

		const refundFields = await fetchOrderRefundFields(orderId);
		const returnRequest = await fetchLatestReturnRequest(orderId);

		const sid = String(order.SellerId || '').toLowerCase();
		const bid = String(order.BuyerId || '').toLowerCase();
		const uid = String(UserId || '').toLowerCase();

		return res.status(200).json({
			success: true,
			data: {
				...order,
				...refundFields,
				OrderItems: JSON.parse(order.OrderItems || '[]'),
				IsBuyer: bid === uid,
				IsSeller: sid === uid,
				ReturnRequest: returnRequest,
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

		// Issue Stripe refund — payment was captured at checkout, buyer must get money back
		if (updated.PaymentIntentId) {
			try {
				await stripe.refunds.create({
					payment_intent: updated.PaymentIntentId,
					idempotencyKey: `cancel-${orderId}`,
				});
			} catch (stripeErr) {
				console.error('⚠️ Stripe refund failed on cancel for order', orderId, stripeErr.message);
				// Order is already cancelled in DB — log for manual resolution but don't block the response
			}
		}

		return res.status(200).json({
			success: true,
			message: 'Order cancelled successfully. Your refund has been initiated.',
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
		const { status, reason, trackingNumber, trackingUrl } = req.body;

		if (!status) {
			return res.status(400).json({ success: false, message: 'Status is required.' });
		}

		if (status === 'Shipped' && !trackingUrl?.trim()) {
			return res.status(400).json({ success: false, message: 'Tracking link is required when marking an order as shipped.' });
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

		// Save rejection reason if provided
		if (status === 'Rejected' && reason) {
			try {
				await db.executeProcedure('UpdateOrderRejectionReason', { OrderId: orderId, RejectionReason: reason });
			} catch (dbErr) {
				console.error('⚠️ Failed to save rejection reason:', dbErr.message);
			}
		}

		// Save tracking info if provided
		if (status === 'Shipped' && trackingNumber) {
			try {
				await db.executeProcedure('UpdateOrderTrackingInfo', { OrderId: orderId, TrackingNumber: trackingNumber, TrackingUrl: trackingUrl });
			} catch (dbErr) {
				console.error('⚠️ Failed to save tracking info:', dbErr.message);
			}
		}

		if (status === 'Delivered') {
			await ensureOrderReturnSchema();
			await setOrderDeliveredTimestamp(orderId);
		}

		const messages = {
			Confirmed: 'Order accepted successfully.',
			Rejected: 'Order rejected. Stock has been restored.',
			Shipped: 'Order marked as shipped.',
			Delivered: 'Order marked as delivered.',
			Sold: 'Order marked as sold.',
		};

		res.status(200).json({
			success: true,
			message: messages[status] || 'Order status updated.',
			data: updated,
		});

		// Fire-and-forget buyer notification — Sold and Cancelled need no email
		if (['Confirmed', 'Rejected', 'Shipped', 'Delivered'].includes(status)) {
			(async () => {
				try {
					// GetOrderById joins Users — BuyerEmail and BuyerName are already in the result
					const orderResult = await db.executeProcedure('GetOrderById', { OrderId: orderId, UserId: SellerId });
					const orderRow = orderResult.recordset?.[0];
					if (!orderRow) {
						console.error(`⚠️ Email skipped: GetOrderById returned nothing for order ${orderId}`);
						return;
					}

					const orderItems = JSON.parse(orderRow.OrderItems || '[]');
					const trackingInfo = (status === 'Shipped' && trackingNumber)
						? { trackingNumber, trackingUrl: trackingUrl || null }
						: null;

					await sendOrderStatusUpdateEmail(
						orderRow.BuyerEmail,
						orderRow.BuyerName,
						orderId,
						status,
						orderItems,
						orderRow.TotalAmount,
						reason || null,
						trackingInfo
					);
				} catch (emailErr) {
					console.error('⚠️ Failed to send order status email:', emailErr.message);
				}
			})();
		}

		return;
	} catch (error) {
		console.error('Error updating order status:', error);
		const message = error.message || 'Failed to update order status.';
		return res.status(400).json({ success: false, message });
	}
});

// POST seller requests commission refund for a returned order
orderRouter.post('/:orderId/commission-refund', authenticateToken, async (req, res) => {
	try {
		const SellerId = req.user.id;
		const { orderId } = req.params;
		const { commissionAmount, sellerNote, returnRequestId } = req.body;

		if (!commissionAmount || Number(commissionAmount) <= 0) {
			return res.status(400).json({ success: false, message: 'Commission amount is required.' });
		}

		const result = await db.executeProcedure('UpsertCommissionRefundRequest', {
			OrderId: orderId,
			ReturnRequestId: returnRequestId || null,
			SellerId,
			CommissionAmount: Number(commissionAmount),
			SellerNote: sellerNote || null,
		});

		return res.status(201).json({ success: true, message: 'Commission refund request submitted.', data: result.recordset?.[0] });
	} catch (error) {
		console.error('Error creating commission refund request:', error);
		const message = error.message || 'Failed to submit commission refund request.';
		return res.status(400).json({ success: false, message });
	}
});

export default orderRouter;
