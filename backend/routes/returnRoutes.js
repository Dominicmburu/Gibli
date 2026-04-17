import express from 'express';
import mssql from 'mssql';
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
			return res.status(400).json({ success: false, message: 'A partial refund has already been issued for this order.' });
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

			let parsedReturnItems = [];
			try {
				parsedReturnItems = JSON.parse(req.body?.returnItems || '[]');
			} catch { parsedReturnItems = []; }

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

		const bundle = await fetchLatestReturnRequest(orderId);
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
		const { decision, sellerInstructions, sellerRejectionReason, resolutionType, partialRefundAmount } = req.body || {};
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
			if (resolutionType === 'physical_return' && instr.length < 15) {
				return res.status(400).json({
					success: false,
					message: 'Please explain how the buyer should return the item (at least 15 characters).',
				});
			}

			// Validate partial refund amount
			let parsedPartialAmount = null;
			if (resolutionType === 'partial_refund') {
				parsedPartialAmount = Number(partialRefundAmount);
				if (!parsedPartialAmount || parsedPartialAmount <= 0) {
					return res.status(400).json({ success: false, message: 'A valid partial refund amount is required.' });
				}
				const orderTotal = Number(pickCol(row, 'TotalAmount') || 0);
				if (parsedPartialAmount > orderTotal) {
					return res.status(400).json({ success: false, message: `Amount cannot exceed order total of €${orderTotal.toFixed(2)}.` });
				}
			}

			// Build instructions text
			let instrText = instr;
			if (resolutionType === 'refund_without_return' && !instr) {
				instrText = 'You do not need to return the item. The seller will transfer the refund to you directly.';
			}
			if (resolutionType === 'exchange' && !instr) {
				instrText = 'A replacement item will be shipped to you. No need to return the original.';
			}
			if (resolutionType === 'partial_refund' && !instr) {
				instrText = `The seller will transfer €${parsedPartialAmount?.toFixed(2) || '0.00'} to you directly. You may keep the item.`;
			}

			await db.executeProcedure('ApproveReturnRequest', {
				ReturnRequestId: returnRequestId,
				SellerInstructions: instrText,
				OrderId: oid,
				ResolutionType: resolutionType || 'physical_return',
				PartialRefundAmount: parsedPartialAmount,
			});

			// Notify buyer (fire-and-forget)
			;(async () => {
				try {
					await sendReturnApprovedEmail(buyerEmail, buyerName, oid, instrText);
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
 * Seller: upload proof of manual bank transfer.
 * Used for physical_return (item received, money sent), refund_without_return, and partial_refund.
 * Closes the return and marks the order as Sold. No Stripe involved.
 */
returnRouter.post('/:returnRequestId/upload-proof', authenticateToken, upload.single('proof'), async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		const rowSeller = String(row?.SellerId ?? row?.sellerid ?? '').toLowerCase();

		if (!row || rowSeller !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (pickCol(row, 'Status') !== 'Approved') {
			return res.status(400).json({ success: false, message: 'Only approved returns can have proof uploaded.' });
		}
		const resolutionType = pickCol(row, 'ResolutionType');
		if (resolutionType === 'exchange') {
			return res.status(400).json({ success: false, message: 'Exchange returns use the exchange delivery flow, not proof upload.' });
		}
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'Please upload a proof image of the bank transfer.' });
		}

		// Upload proof image to S3
		const proofUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'return-proofs');

		// Mark return as complete in DB (stock restored for physical returns inside the proc)
		await db.executeProcedure('MarkReturnProofUploaded', {
			ReturnRequestId: returnRequestId,
			ProofUrl: proofUrl,
			ResolutionType: resolutionType,
		});

		// Notify buyer (fire-and-forget)
		;(async () => {
			try {
				const buyerEmail = pickCol(row, 'BuyerEmail');
				const buyerName  = pickCol(row, 'BuyerName');
				const oid        = pickCol(row, 'OrderId');
				const amount     = Number(pickCol(row, 'PartialRefundAmount') || pickCol(row, 'TotalAmount') || 0);
				await sendRefundProcessedEmail(buyerEmail, buyerName, oid, amount);
			} catch (emailErr) {
				console.error('Failed to send refund proof email:', emailErr.message);
			}
		})();

		const bundle = await fetchLatestReturnRequest(pickCol(row, 'OrderId'));
		return res.status(200).json({ success: true, message: 'Proof uploaded. Return complete — order is now Sold.', data: bundle });
	} catch (error) {
		console.error('Upload proof failed:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to upload proof.' });
	}
});

/** Seller: set / update exchange shipment tracking */
returnRouter.patch('/:returnRequestId/exchange-tracking', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;
		const { trackingNumber, trackingUrl } = req.body || {};

		if (!trackingNumber?.trim()) {
			return res.status(400).json({ success: false, message: 'Tracking number is required.' });
		}

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		if (!row || String(row.SellerId ?? row.sellerid ?? '').toLowerCase() !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (pickCol(row, 'Status') !== 'Approved') {
			return res.status(400).json({ success: false, message: 'Tracking can only be set on approved returns.' });
		}
		if (pickCol(row, 'ResolutionType') !== 'exchange') {
			return res.status(400).json({ success: false, message: 'This endpoint is only for exchange returns.' });
		}

		await db.executeProcedure('UpdateExchangeTracking', {
			ReturnRequestId: returnRequestId,
			ExchangeTrackingNumber: trackingNumber.trim(),
			ExchangeTrackingUrl: trackingUrl?.trim() || null,
		});

		const bundle = await fetchLatestReturnRequest(pickCol(row, 'OrderId'));
		return res.status(200).json({ success: true, message: 'Exchange tracking saved.', data: bundle });
	} catch (error) {
		console.error('Update exchange tracking failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to save exchange tracking.' });
	}
});

/** Seller: mark exchange item as shipped */
returnRouter.post('/:returnRequestId/exchange-shipped', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		if (!row || String(row.SellerId ?? row.sellerid ?? '').toLowerCase() !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (pickCol(row, 'Status') !== 'Approved' || pickCol(row, 'ResolutionType') !== 'exchange') {
			return res.status(400).json({ success: false, message: 'Only approved exchange returns can be marked shipped.' });
		}
		if (!pickCol(row, 'ExchangeTrackingNumber')) {
			return res.status(400).json({ success: false, message: 'Please enter a tracking number before marking as shipped.' });
		}

		await db.executeProcedure('MarkExchangeShipped', { ReturnRequestId: returnRequestId });

		const bundle = await fetchLatestReturnRequest(pickCol(row, 'OrderId'));
		return res.status(200).json({ success: true, message: 'Exchange marked as shipped.', data: bundle });
	} catch (error) {
		console.error('Mark exchange shipped failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to mark exchange as shipped.' });
	}
});

/** Seller: mark exchange item as delivered — closes return, order → Sold */
returnRouter.post('/:returnRequestId/exchange-delivered', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { returnRequestId } = req.params;

		const rowResult = await db.executeProcedure('GetReturnRequestWithOrder', { ReturnRequestId: returnRequestId });
		const row = rowResult.recordset?.[0];
		if (!row || String(row.SellerId ?? row.sellerid ?? '').toLowerCase() !== String(sellerId).toLowerCase()) {
			return res.status(404).json({ success: false, message: 'Return request not found.' });
		}
		if (pickCol(row, 'ResolutionType') !== 'exchange') {
			return res.status(400).json({ success: false, message: 'Only exchange returns can be marked delivered.' });
		}
		if (!pickCol(row, 'ExchangeShippedAt')) {
			return res.status(400).json({ success: false, message: 'Mark the exchange as shipped first.' });
		}

		await db.executeProcedure('MarkExchangeDelivered', { ReturnRequestId: returnRequestId });

		const bundle = await fetchLatestReturnRequest(pickCol(row, 'OrderId'));
		return res.status(200).json({ success: true, message: 'Exchange delivered. Order is now Sold.', data: bundle });
	} catch (error) {
		console.error('Mark exchange delivered failed:', error);
		return res.status(500).json({ success: false, message: 'Failed to mark exchange as delivered.' });
	}
});

/** Seller: full detail for a single return request */
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
			ProofUrl: pickCol(row, 'ProofUrl'),
			ProofUploadedAt: pickCol(row, 'ProofUploadedAt'),
			ExchangeTrackingNumber: pickCol(row, 'ExchangeTrackingNumber'),
			ExchangeTrackingUrl: pickCol(row, 'ExchangeTrackingUrl'),
			ExchangeShippedAt: pickCol(row, 'ExchangeShippedAt'),
			ExchangeDeliveredAt: pickCol(row, 'ExchangeDeliveredAt'),
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

/** Seller: summary list of all return requests */
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

/** Buyer: submit return shipment tracking (physical_return flow) */
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

export default returnRouter;
