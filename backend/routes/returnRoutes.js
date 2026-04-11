import express from 'express';
import mssql from 'mssql';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middlewares/multerSetup.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import { uploadToS3 } from '../services/s3UploadService.js';
import {
	fetchLatestReturnRequest,
	pickCol,
	returnWindowRemainingMs,
} from '../services/orderReturnSupport.js';
import {
	sendReturnSubmittedEmail,
	sendReturnApprovedEmail,
	sendReturnRejectedEmail,
	sendRefundProcessedEmail,
	sendPartialRefundAgreedEmail,
	sendBuyerShippedEmail,
} from '../services/emailService.js';

const returnRouter = express.Router();
const db = new DbHelper();
const stripe = new Stripe(process.env.SK_TEST);

const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;

const buildReturnMediaPayload = async (files) => {
	const images = files.filter((f) => f.mimetype?.startsWith('image/'));
	const videos = files.filter((f) => f.mimetype?.startsWith('video/'));
	const invalid = files.filter(
		(f) => !f.mimetype?.startsWith('image/') && !f.mimetype?.startsWith('video/')
	);
	if (invalid.length) throw new Error('Only image and video files are allowed.');
	if (images.length > MAX_IMAGES) throw new Error(`At most ${MAX_IMAGES} images.`);
	if (videos.length > MAX_VIDEOS) throw new Error(`At most ${MAX_VIDEOS} video.`);
	const uploads = [];
	for (const file of files) {
		const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'returns');
		uploads.push({
			MediaId: uuidv4(),
			MediaType: file.mimetype?.startsWith('video/') ? 'video' : 'image',
			MediaUrl: url,
		});
	}
	return uploads;
};

/** Buyer: submit return / refund request */
returnRouter.post('/orders/:orderId', authenticateToken, upload.any(), async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { orderId } = req.params;
		const reason = (req.body?.reason || '').trim();

		if (reason.length < 10) {
			return res.status(400).json({ success: false, message: 'Please describe your reason for returning (at least 10 characters).' });
		}

		const files = req.files || [];

		const orderResult = await db.executeProcedure('GetOrderForReturn', { OrderId: orderId });
		const ord = orderResult.recordset?.[0];
		const ordBuyer = String(pickCol(ord, 'BuyerId') ?? '').toLowerCase();
		if (!ord || ordBuyer !== String(buyerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Order not found.' });
		}

		const deliveryStatus = pickCol(ord, 'DeliveryStatus');
		const refundStatus = pickCol(ord, 'RefundStatus');

		if (!['Delivered', 'Sold'].includes(deliveryStatus)) {
			return res.status(400).json({ success: false, message: 'Returns are only available after delivery.' });
		}
		// Check RefundStatus — not DeliveryStatus — for active return
		if (['ReturnRequested', 'ReturnApproved'].includes(refundStatus)) {
			return res.status(400).json({ success: false, message: 'This order already has an active return.' });
		}
		if (returnWindowRemainingMs(pickCol(ord, 'DeliveredAt'), pickCol(ord, 'UpdatedAt')) < 0) {
			return res.status(400).json({ success: false, message: 'The 14-day return window has ended.' });
		}

		const latest = await fetchLatestReturnRequest(orderId);
		if (latest?.Status === 'Pending') {
			return res.status(400).json({ success: false, message: 'You already have a return request pending review.' });
		}
		if (latest?.Status === 'Approved' || refundStatus === 'ReturnApproved' || refundStatus === 'Refunded') {
			return res.status(400).json({ success: false, message: 'A return has already been approved or completed for this order.' });
		}
		if (refundStatus === 'PartialRefunded') {
			return res.status(400).json({ success: false, message: 'A partial refund has already been issued for this order. No further returns can be submitted.' });
		}

		const mediaPayload = await buildReturnMediaPayload(files);
		const returnRequestId = uuidv4();

		const pool = await db.pool;
		const transaction = new mssql.Transaction(pool);
		await transaction.begin();
		try {
			await transaction.request()
				.input('ReturnRequestId', returnRequestId)
				.input('OrderId', orderId)
				.input('BuyerId', buyerId)
				.input('Reason', reason)
				.execute('InsertReturnRequest');

			for (const m of mediaPayload) {
				await transaction.request()
					.input('MediaId', m.MediaId)
					.input('ReturnRequestId', returnRequestId)
					.input('MediaUrl', m.MediaUrl)
					.input('MediaType', m.MediaType)
					.execute('InsertReturnMedia');
			}

			// Insert return items if buyer specified which items
			let parsedReturnItems = [];
			try {
				parsedReturnItems = JSON.parse(req.body?.returnItems || '[]');
			} catch { parsedReturnItems = []; }

			// Validate every submitted OrderItemId actually belongs to this order
			if (parsedReturnItems.length > 0) {
				const validItemsResult = await transaction.request()
					.input('OrderId', orderId)
					.execute('GetOrderItems');
				const validIds = new Set(
					(validItemsResult.recordset || []).map((r) =>
						String(r.OrderItemId ?? r.orderitemid ?? '').toLowerCase()
					)
				);
				for (const item of parsedReturnItems) {
					if (!validIds.has(String(item.orderItemId || '').toLowerCase())) {
						await transaction.rollback();
						return res.status(400).json({ success: false, message: `Item ${item.orderItemId} does not belong to this order.` });
					}
				}
			}

			for (const item of parsedReturnItems) {
				await transaction.request()
					.input('ReturnItemId', uuidv4())
					.input('ReturnRequestId', returnRequestId)
					.input('OrderItemId', item.orderItemId)
					.input('ProductId', item.productId)
					.input('ProductName', item.productName || '')
					.input('ProductImageUrl', item.productImageUrl || null)
					.input('ReturnQuantity', item.returnQuantity || 1)
					.input('UnitPrice', item.unitPrice || 0)
					.execute('InsertReturnItem');
			}

			await transaction.request()
				.input('OrderId', orderId)
				.execute('SetOrderReturnRequested');

			await transaction.commit();
		} catch (e) {
			await transaction.rollback();
			throw e;
		}

		// Notify seller (fire-and-forget)
		const bundle = await fetchLatestReturnRequest(orderId);
		;(async () => {
			try {
				const sellerResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
				const row = sellerResult.recordset?.[0];
				if (row) {
					await sendReturnSubmittedEmail(
						pickCol(row, 'SellerEmail'),
						pickCol(row, 'SellerBusinessName'),
						orderId,
						pickCol(row, 'BuyerName'),
						reason
					);
				}
			} catch (emailErr) {
				console.error('Failed to send return submitted email:', emailErr.message);
			}
		})();

		return res.status(201).json({ success: true, message: 'Return request submitted.', data: bundle });
	} catch (error) {
		console.error('Return request failed:', error);
		return res.status(400).json({ success: false, message: error.message || 'Failed to submit return request.' });
	}
});

/** Buyer or seller: latest return for order */
returnRouter.get('/orders/:orderId', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.id;
		const { orderId } = req.params;
		const orderResult = await db.executeProcedure('GetOrderParties', { OrderId: orderId });
		const ord = orderResult.recordset?.[0];
		const uid = String(userId).toLowerCase();
		const gBuyer = String(ord?.BuyerId ?? ord?.buyerid ?? '').toLowerCase();
		const gSeller = String(ord?.SellerId ?? ord?.sellerid ?? '').toLowerCase();
		if (!ord || (gBuyer !== uid && gSeller !== uid)) {
			return res.status(404).json({ success: false, message: 'Order not found.' });
		}
		const bundle = await fetchLatestReturnRequest(orderId);
		return res.status(200).json({ success: true, data: bundle });
	} catch (error) {
		console.error('Fetch return request failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to load return request.' });
	}
});

/** Seller: approve or reject return */
returnRouter.patch('/:returnRequestId', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;
		const { decision, sellerInstructions, sellerRejectionReason, resolutionType } = req.body || {};
		if (!['approve', 'reject'].includes(decision)) {
			return res.status(400).json({ success: false, message: 'decision must be approve or reject.' });
		}

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		const rowSeller = String(row?.SellerId ?? row?.sellerid ?? '').toLowerCase();
		const st = row?.Status ?? row?.status;
		if (!row || rowSeller !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (st !== 'Pending') {
			return res.status(400).json({ success: false, message: 'This return request has already been resolved.' });
		}

		const oid = row.OrderId ?? row.orderid;
		const buyerEmail = pickCol(row, 'BuyerEmail');
		const buyerName = pickCol(row, 'BuyerName');

		if (decision === 'approve') {
			const instr = (sellerInstructions || '').trim();
			if (instr.length < 15) {
				return res.status(400).json({
					success: false,
					message: 'Please explain how the buyer should return the item (at least 15 characters).',
				});
			}
			await db.executeProcedure('ApproveReturnRequest', {
				ReturnRequestId: returnRequestId,
				SellerInstructions: instr,
				OrderId: oid,
				ResolutionType: resolutionType || 'physical_return',
			});

			// Notify buyer (fire-and-forget)
			;(async () => {
				try {
					await sendReturnApprovedEmail(buyerEmail, buyerName, oid, instr);
				} catch (emailErr) {
					console.error('Failed to send return approved email:', emailErr.message);
				}
			})();
		} else {
			const rej = (sellerRejectionReason || '').trim();
			if (rej.length < 10) {
				return res.status(400).json({ success: false, message: 'Please explain why you are rejecting (at least 10 characters).' });
			}
			await db.executeProcedure('RejectReturnRequest', {
				ReturnRequestId: returnRequestId,
				SellerRejectionReason: rej,
				OrderId: oid,
			});

			// Notify buyer (fire-and-forget)
			;(async () => {
				try {
					await sendReturnRejectedEmail(buyerEmail, buyerName, oid, rej);
				} catch (emailErr) {
					console.error('Failed to send return rejected email:', emailErr.message);
				}
			})();
		}

		const bundle = await fetchLatestReturnRequest(oid);
		return res.status(200).json({ success: true, message: 'Return request updated.', data: bundle });
	} catch (error) {
		console.error('Resolve return failed:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to update return request.' });
	}
});

/**
 * Seller: confirm item received — triggers automatic Stripe refund and closes the return.
 * The seller never touches money; Gibli processes the refund directly.
 */
returnRouter.post('/:returnRequestId/mark-refunded', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		const mrSeller = String(row?.SellerId ?? row?.sellerid ?? '').toLowerCase();
		const mrStatus = row?.Status ?? row?.status;
		const mrOid = row?.OrderId ?? row?.orderid;

		if (!row || mrSeller !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (mrStatus !== 'Approved') {
			return res.status(400).json({ success: false, message: 'Only approved returns can be marked as refunded.' });
		}

		// Fetch return items first — needed for both Stripe amount calc and stock restoration
		const resolutionType = pickCol(row, 'ResolutionType');
		const paymentIntentId = pickCol(row, 'PaymentIntentId');
		const itemsResult = await db.executeProcedure('GetReturnItems', { ReturnRequestId: returnRequestId });
		const returnItems = itemsResult.recordset || [];

		// Issue Stripe refund — skip for exchange (buyer gets replacement, not money back)
		// Always specify amount explicitly — this refunds only the product+shipping total,
		// NOT the processing fee (which is non-refundable, same as a booking fee).
		const orderTotal = Number(pickCol(row, 'TotalAmount') || 0);
		let actualRefundAmount = orderTotal; // track the real amount for the email

		if (paymentIntentId && resolutionType !== 'exchange') {
			try {
				let refundAmountCents = Math.round(orderTotal * 100);

				// If specific items were returned, refund only their sub-total
				if (returnItems.length > 0) {
					const partialTotal = returnItems.reduce((sum, ri) => {
						const qty = ri.ReturnQuantity ?? ri.returnquantity ?? 1;
						const price = Number(ri.UnitPrice ?? ri.unitprice ?? 0);
						return sum + qty * price;
					}, 0);
					if (partialTotal > 0 && partialTotal < orderTotal) {
						refundAmountCents = Math.round(partialTotal * 100);
						actualRefundAmount = partialTotal; // use real partial amount in email
					}
				}

				await stripe.refunds.create({
					payment_intent: paymentIntentId,
					amount: refundAmountCents,
				}, { idempotencyKey: `refund-${returnRequestId}` });
			} catch (stripeErr) {
				console.error('Stripe refund failed:', stripeErr.message);
				return res.status(500).json({ success: false, message: 'Failed to process refund via Stripe. Please try again.' });
			}
		}

		// Update DB: mark order as Refunded
		await db.executeProcedure('MarkOrderRefunded', { OrderId: mrOid });

		// Restore stock — only for physical returns (buyer is sending item back)
		// refund_without_return = buyer keeps the item, no stock change
		if (resolutionType !== 'refund_without_return') {
			if (returnItems.length > 0) {
				// Partial return — restore only the quantities actually returned
				for (const ri of returnItems) {
					const productId = ri.ProductId ?? ri.productid;
					const qty = Number(ri.ReturnQuantity ?? ri.returnquantity ?? 1);
					await db.executeProcedure('RestoreSpecificItemStock', { ProductId: productId, Quantity: qty });
				}
			} else {
				// No specific items logged — full order return, restore all
				await db.executeProcedure('RestoreOrderItemStock', { OrderId: mrOid });
			}
		}

		// Notify buyer with the actual refund amount (not blindly the order total)
		;(async () => {
			try {
				const buyerEmail = pickCol(row, 'BuyerEmail');
				const buyerName = pickCol(row, 'BuyerName');
				await sendRefundProcessedEmail(buyerEmail, buyerName, mrOid, actualRefundAmount);
			} catch (emailErr) {
				console.error('Failed to send refund processed email:', emailErr.message);
			}
		})();

		const bundle = await fetchLatestReturnRequest(mrOid);
		return res.status(200).json({ success: true, message: 'Refund processed successfully.', data: bundle });
	} catch (error) {
		console.error('Mark refunded failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to process refund.' });
	}
});

/** Seller: full detail for a single return request (items + media + order info) */
returnRouter.get('/:returnRequestId/detail', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		if (!row) return res.status(404).json({ success: false, message: 'Return request not found.' });

		const rowSeller = String(row?.SellerId ?? row?.sellerid ?? '').toLowerCase();
		if (rowSeller !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}

		const [mediaResult, itemsResult] = await Promise.all([
			db.executeProcedure('GetReturnMedia', { ReturnRequestId: returnRequestId }),
			db.executeProcedure('GetReturnItems', { ReturnRequestId: returnRequestId }),
		]);

		const returnData = {
			ReturnRequestId: pickCol(row, 'ReturnRequestId'),
			OrderId: pickCol(row, 'OrderId'),
			BuyerId: pickCol(row, 'BuyerId'),
			SellerId: pickCol(row, 'SellerId'),
			Status: pickCol(row, 'Status'),
			Reason: pickCol(row, 'Reason'),
			ResolutionType: pickCol(row, 'ResolutionType'),
			PartialRefundAmount: pickCol(row, 'PartialRefundAmount'),
			SellerInstructions: pickCol(row, 'SellerInstructions'),
			SellerRejectionReason: pickCol(row, 'SellerRejectionReason'),
			CreatedAt: pickCol(row, 'CreatedAt'),
			ResolvedAt: pickCol(row, 'ResolvedAt'),
			RefundStatus: pickCol(row, 'RefundStatus'),
			TotalAmount: pickCol(row, 'TotalAmount'),
			PaymentIntentId: pickCol(row, 'PaymentIntentId'),
			BuyerName: pickCol(row, 'BuyerName'),
			BuyerEmail: pickCol(row, 'BuyerEmail'),
			BuyerTrackingNumber: pickCol(row, 'BuyerTrackingNumber'),
			BuyerTrackingUrl: pickCol(row, 'BuyerTrackingUrl'),
			BuyerShippedAt: pickCol(row, 'BuyerShippedAt'),
			SellerBusinessName: pickCol(row, 'SellerBusinessName'),
			SellerEmail: pickCol(row, 'SellerEmail'),
			Media: (mediaResult.recordset || []).map((m) => ({
				MediaId: pickCol(m, 'MediaId'),
				MediaUrl: pickCol(m, 'MediaUrl'),
				MediaType: pickCol(m, 'MediaType'),
			})),
			Items: (itemsResult.recordset || []).map((ri) => ({
				ReturnItemId: pickCol(ri, 'ReturnItemId'),
				OrderItemId: pickCol(ri, 'OrderItemId'),
				ProductId: pickCol(ri, 'ProductId'),
				ProductName: pickCol(ri, 'ProductName'),
				ProductImageUrl: pickCol(ri, 'ProductImageUrl'),
				ReturnQuantity: pickCol(ri, 'ReturnQuantity'),
				UnitPrice: pickCol(ri, 'UnitPrice'),
				ItemRefundAmount: pickCol(ri, 'ItemRefundAmount'),
			})),
		};

		return res.status(200).json({ success: true, data: returnData });
	} catch (error) {
		console.error('Fetch return detail failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to load return details.' });
	}
});

/** Seller: summary list of all return requests across their orders */
returnRouter.get('/seller', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const result = await db.executeProcedure('GetSellerReturnSummary', { SellerId: sellerId });
		return res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Fetch seller returns failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to load return requests.' });
	}
});

/** Buyer: submit return shipment tracking */
returnRouter.patch('/:returnRequestId/buyer-tracking', authenticateToken, async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { returnRequestId } = req.params;
		const { buyerTrackingNumber, buyerTrackingUrl } = req.body || {};

		if (!buyerTrackingNumber?.trim()) {
			return res.status(400).json({ success: false, message: 'Tracking number is required.' });
		}
		if (!buyerTrackingUrl?.trim()) {
			return res.status(400).json({ success: false, message: 'Tracking URL is required.' });
		}

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		if (!row) return res.status(404).json({ success: false, message: 'Return request not found.' });

		const rowBuyer = String(pickCol(row, 'BuyerId') ?? '').toLowerCase();
		if (rowBuyer !== String(buyerId).toLowerCase()) {
			return res.status(403).json({ success: false, message: 'Not authorized.' });
		}
		if (pickCol(row, 'Status') !== 'Approved') {
			return res.status(400).json({ success: false, message: 'Tracking can only be added to approved returns.' });
		}
		if (pickCol(row, 'ResolutionType') !== 'physical_return') {
			return res.status(400).json({ success: false, message: 'Tracking is only needed for physical returns.' });
		}

		await db.executeProcedure('UpdateBuyerTracking', {
			ReturnRequestId: returnRequestId,
			BuyerTrackingNumber: buyerTrackingNumber.trim(),
			BuyerTrackingUrl: buyerTrackingUrl.trim(),
		});

		// Notify seller (fire-and-forget)
		;(async () => {
			try {
				await sendBuyerShippedEmail(
					pickCol(row, 'SellerEmail'),
					pickCol(row, 'SellerBusinessName'),
					pickCol(row, 'OrderId'),
					pickCol(row, 'BuyerName'),
					buyerTrackingNumber.trim(),
					buyerTrackingUrl.trim()
				);
			} catch (emailErr) {
				console.error('Failed to send buyer shipped email:', emailErr.message);
			}
		})();

		const bundle = await fetchLatestReturnRequest(pickCol(row, 'OrderId'));
		return res.status(200).json({ success: true, message: 'Tracking information saved.', data: bundle });
	} catch (error) {
		console.error('Update buyer tracking failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to save tracking information.' });
	}
});

/**
 * Seller: offer a partial refund — buyer keeps the item, seller refunds a set amount.
 * Validates, fires Stripe partial refund immediately, closes the return request.
 */
returnRouter.post('/:returnRequestId/partial-refund', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;
		const { amount, sellerNote } = req.body || {};

		const parsedAmount = Number(amount);
		if (!parsedAmount || parsedAmount <= 0) {
			return res.status(400).json({ success: false, message: 'A valid refund amount is required.' });
		}

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		const rowSeller = String(row?.SellerId ?? row?.sellerid ?? '').toLowerCase();

		if (!row || rowSeller !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}

		const st = pickCol(row, 'Status');
		if (st !== 'Pending') {
			return res.status(400).json({ success: false, message: 'This return request has already been resolved.' });
		}

		const orderTotal = Number(pickCol(row, 'TotalAmount') || 0);
		if (parsedAmount > orderTotal) {
			return res.status(400).json({ success: false, message: `Refund amount cannot exceed the order total of €${orderTotal.toFixed(2)}.` });
		}

		const oid = pickCol(row, 'OrderId');
		const buyerEmail = pickCol(row, 'BuyerEmail');
		const buyerName = pickCol(row, 'BuyerName');
		const paymentIntentId = pickCol(row, 'PaymentIntentId');
		const note = (sellerNote || '').trim() || null;

		// Issue Stripe partial refund
		if (paymentIntentId) {
			try {
				await stripe.refunds.create({
					payment_intent: paymentIntentId,
					amount: Math.round(parsedAmount * 100), // Stripe expects cents
				}, { idempotencyKey: `partial-${returnRequestId}` });
			} catch (stripeErr) {
				console.error('Stripe partial refund failed:', stripeErr.message);
				return res.status(500).json({ success: false, message: 'Failed to process refund via Stripe. Please try again.' });
			}
		}

		// Update DB
		await db.executeProcedure('ProcessPartialRefund', {
			ReturnRequestId: returnRequestId,
			OrderId: oid,
			Amount: parsedAmount,
			SellerNote: note,
		});

		// Notify buyer (fire-and-forget)
		;(async () => {
			try {
				await sendPartialRefundAgreedEmail(buyerEmail, buyerName, oid, parsedAmount, note);
			} catch (emailErr) {
				console.error('Failed to send partial refund email:', emailErr.message);
			}
		})();

		const bundle = await fetchLatestReturnRequest(oid);
		return res.status(200).json({ success: true, message: `Partial refund of €${parsedAmount.toFixed(2)} processed.`, data: bundle });
	} catch (error) {
		console.error('Partial refund failed:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to process partial refund.' });
	}
});

export default returnRouter;
