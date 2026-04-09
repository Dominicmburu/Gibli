import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middlewares/multerSetup.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import { uploadToS3 } from '../services/s3UploadService.js';
import { sendNewReviewEmail } from '../services/emailService.js';

const reviewRouter = express.Router();
const db = new DbHelper();

const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;
const DEFAULT_LIMIT = 10;

const getUserFromRequest = (req) => {
	const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
	if (!token) return null;
	try {
		return jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return null;
	}
};

const parseIntSafe = (value, fallback = null) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const buildReviewMediaPayload = async (files) => {
	const images = files.filter((file) => file.mimetype?.startsWith('image/'));
	const videos = files.filter((file) => file.mimetype?.startsWith('video/'));
	const invalid = files.filter(
		(file) => !file.mimetype?.startsWith('image/') && !file.mimetype?.startsWith('video/')
	);

	if (invalid.length > 0) {
		throw new Error('Only image and video files are allowed.');
	}
	if (images.length > MAX_IMAGES) {
		throw new Error(`You can upload at most ${MAX_IMAGES} images.`);
	}
	if (videos.length > MAX_VIDEOS) {
		throw new Error(`You can upload at most ${MAX_VIDEOS} video.`);
	}

	const uploads = [];
	for (const file of files) {
		const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'reviews');
		uploads.push({
			MediaId: uuidv4(),
			MediaType: file.mimetype?.startsWith('video/') ? 'video' : 'image',
			MediaUrl: url,
		});
	}

	return uploads;
};

reviewRouter.use(async (req, res, next) => {
	try {
		await db.executeProcedure('EnsureReviewSchema', {});
		next();
	} catch (error) {
		console.error('Failed to ensure review schema:', error);
		res.status(500).json({ success: false, message: 'Review module initialization failed.' });
	}
});

reviewRouter.get('/eligibility/order/:orderId', authenticateToken, async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { orderId } = req.params;
		const result = await db.executeProcedure('GetOrderReviewEligibility', { OrderId: orderId, BuyerId: buyerId });

		return res.status(200).json({
			success: true,
			data: result.recordset.map((row) => ({
				...row,
				HasReview: !!row.ReviewId,
				DaysLeft: row.DaysLeft < 0 ? 0 : row.DaysLeft,
				Media: row.Media ? JSON.parse(row.Media) : [],
			})),
		});
	} catch (error) {
		console.error('Failed to fetch review eligibility:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch review eligibility.' });
	}
});

reviewRouter.post('/', authenticateToken, upload.any(), async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { productId, orderId, orderItemId, comment, productName } = req.body;
		const rating = parseIntSafe(req.body.rating, 0);

		if (!productId || !orderId || !orderItemId || rating < 1 || rating > 5) {
			return res.status(400).json({ success: false, message: 'Missing required review fields.' });
		}

		const eligibilityResult = await db.executeProcedure('CheckReviewEligibility', {
			BuyerId: buyerId,
			OrderId: orderId,
			OrderItemId: orderItemId,
			ProductId: productId,
		});

		const eligibility = eligibilityResult.recordset?.[0];
		if (!eligibility) {
			return res.status(404).json({ success: false, message: 'Purchase record not found for this product.' });
		}
		if (!eligibility.IsEligible) {
			return res.status(400).json({
				success: false,
				message: 'You can only review delivered/sold orders within 15 days after delivery.',
			});
		}

		const existingResult = await db.executeProcedure('CheckExistingReview', { ProductId: productId, BuyerId: buyerId });
		const existing = existingResult.recordset?.[0];
		if (existing) {
			return res.status(409).json({
				success: false,
				message: 'You have already reviewed this product. Use update instead.',
				data: { reviewId: existing.ReviewId },
			});
		}

		const mediaRows = await buildReviewMediaPayload(req.files || []);
		const reviewId = uuidv4();

		await db.executeProcedure('InsertReview', {
			ReviewId: reviewId,
			ProductId: productId,
			UserId: buyerId,
			Rating: rating,
			Comment: comment || null,
			OrderId: orderId,
			OrderItemId: orderItemId,
			SellerId: eligibility.SellerId,
		});

		for (const media of mediaRows) {
			await db.executeProcedure('InsertReviewMedia', {
				MediaId: media.MediaId,
				ReviewId: reviewId,
				MediaType: media.MediaType,
				MediaURL: media.MediaUrl,
			});
		}

		// Fire-and-forget: notify seller of new review
		(async () => {
			try {
				const sellerUserRes = await db.executeProcedure('GetUserById', { UserId: eligibility.SellerId });
				const su = sellerUserRes.recordset?.[0];
				if (su) {
					await sendNewReviewEmail(su.Email, su.Username, productName || productId, req.user.username || 'A buyer', rating);
				}
			} catch { /* non-critical */ }
		})();

		return res.status(201).json({
			success: true,
			message: 'Review submitted successfully.',
			data: { reviewId },
		});
	} catch (error) {
		console.error('Failed to create review:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to create review.' });
	}
});

reviewRouter.patch('/:reviewId', authenticateToken, upload.any(), async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { reviewId } = req.params;
		const rating = parseIntSafe(req.body.rating, 0);
		const { comment, orderId: reviewOrderId } = req.body;
		if (rating < 1 || rating > 5) {
			return res.status(400).json({ success: false, message: 'Rating must be from 1 to 5.' });
		}

		const check = await db.executeProcedure('CheckReviewOwnershipBuyer', { ReviewId: reviewId, UserId: buyerId });
		if (!check.recordset?.[0]) {
			return res.status(404).json({ success: false, message: 'Review not found.' });
		}

		await db.executeProcedure('UpdateReview', { ReviewId: reviewId, Rating: rating, Comment: comment || null, OrderId: reviewOrderId || null });

		const removeMedia = req.body.removeMedia ? JSON.parse(req.body.removeMedia) : [];
		if (Array.isArray(removeMedia) && removeMedia.length) {
			for (const mediaId of removeMedia) {
				await db.executeProcedure('DeleteReviewMedia', { MediaId: mediaId, ReviewId: reviewId });
			}
		}

		const existingMediaResult = await db.executeProcedure('GetReviewMediaByReviewId', { ReviewId: reviewId });
		const existingMedia = existingMediaResult.recordset || [];
		const imageCount = existingMedia.filter((m) => m.MediaType === 'image').length;
		const videoCount = existingMedia.filter((m) => m.MediaType === 'video').length;

		const newFiles = req.files || [];
		const newImages = newFiles.filter((file) => file.mimetype?.startsWith('image/')).length;
		const newVideos = newFiles.filter((file) => file.mimetype?.startsWith('video/')).length;
		if (imageCount + newImages > MAX_IMAGES || videoCount + newVideos > MAX_VIDEOS) {
			return res.status(400).json({
				success: false,
				message: `Media limit exceeded (${MAX_IMAGES} images max and ${MAX_VIDEOS} video max).`,
			});
		}

		const uploads = await buildReviewMediaPayload(newFiles);
		for (const media of uploads) {
			await db.executeProcedure('InsertReviewMedia', {
				MediaId: media.MediaId,
				ReviewId: reviewId,
				MediaType: media.MediaType,
				MediaURL: media.MediaUrl,
			});
		}

		return res.status(200).json({ success: true, message: 'Review updated successfully.' });
	} catch (error) {
		console.error('Failed to update review:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to update review.' });
	}
});

reviewRouter.patch('/:reviewId/response', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { reviewId } = req.params;
		const { response } = req.body;
		if (!response?.trim()) {
			return res.status(400).json({ success: false, message: 'Response is required.' });
		}

		const ownership = await db.executeProcedure('CheckReviewOwnershipSeller', { ReviewId: reviewId, SellerId: sellerId });
		if (!ownership.recordset?.[0]) {
			return res.status(403).json({ success: false, message: 'You are not allowed to respond to this review.' });
		}

		await db.executeProcedure('UpdateReviewSellerResponse', { ReviewId: reviewId, SellerResponse: response.trim() });

		return res.status(200).json({ success: true, message: 'Seller response saved.' });
	} catch (error) {
		console.error('Failed to save seller response:', error);
		return res.status(500).json({ success: false, message: 'Failed to save seller response.' });
	}
});

reviewRouter.post('/:reviewId/helpful', authenticateToken, async (req, res) => {
	try {
		const { reviewId } = req.params;
		const userId = req.user.id;
		const helpful = req.body?.helpful === false ? 0 : 1;

		const reviewRow = await db.executeProcedure('GetReviewProductSeller', { ReviewId: reviewId });
		const rows = reviewRow.recordset || [];
		if (rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Review not found.' });
		}
		const productSellerId = rows[0].ProductSellerId;
		if (productSellerId && productSellerId === userId) {
			return res.status(403).json({ success: false, message: 'The seller cannot mark reviews on their own product as helpful.' });
		}

		await db.executeProcedure('UpsertReviewHelpfulVote', { ReviewId: reviewId, UserId: userId, IsHelpful: helpful });

		return res.status(200).json({ success: true, message: 'Helpful vote updated.' });
	} catch (error) {
		console.error('Failed to update helpful vote:', error);
		return res.status(500).json({ success: false, message: 'Failed to update helpful vote.' });
	}
});

reviewRouter.get('/product/:productId', async (req, res) => {
	try {
		const user = getUserFromRequest(req);
		const userId = user?.id || null;
		const { productId } = req.params;
		const sort = (req.query.sort || 'latest').toString();
		const filter = (req.query.filter || 'all').toString();
		const star = parseIntSafe(req.query.star, null);
		const page = parseIntSafe(req.query.page, 1);
		const limit = Math.max(1, Math.min(20, parseIntSafe(req.query.limit, DEFAULT_LIMIT)));
		const offset = (Math.max(1, page) - 1) * limit;

		const [summaryResult, listResult, countResult] = await Promise.all([
			db.executeProcedure('GetProductReviewSummary', { ProductId: productId }),
			db.executeProcedure('GetProductReviewList', {
				ProductId: productId,
				Filter: filter,
				Star: star,
				Offset: offset,
				Limit: limit,
				Sort: sort,
				CurrentUserId: userId,
			}),
			db.executeProcedure('GetProductReviewCount', { ProductId: productId, Filter: filter, Star: star }),
		]);

		const rows = (listResult.recordset || []).map((row) => ({
			...row,
			Media: row.Media ? JSON.parse(row.Media) : [],
		}));

		return res.status(200).json({
			success: true,
			data: {
				summary: summaryResult.recordset?.[0] || {
					AverageRating: 0,
					TotalReviews: 0,
					WithContentCount: 0,
					WithPhotosCount: 0,
					Star5: 0,
					Star4: 0,
					Star3: 0,
					Star2: 0,
					Star1: 0,
				},
				reviews: rows,
				pagination: {
					page: Math.max(1, page),
					limit,
					total: countResult.recordset?.[0]?.Total || 0,
					hasMore: offset + rows.length < (countResult.recordset?.[0]?.Total || 0),
				},
			},
		});
	} catch (error) {
		console.error('Failed to fetch product reviews:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
	}
});

export default reviewRouter;
