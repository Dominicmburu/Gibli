import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middlewares/multerSetup.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import { uploadToS3 } from '../services/s3UploadService.js';

const messageRouter = express.Router();
const db = new DbHelper();

const MAX_MEDIA_FILES = 4;

/**
 * GET /messages/unread-count
 * Returns unread message count for the current user (seller role by default)
 */
messageRouter.get('/unread-count', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const role = req.query.role === 'Buyer' ? 'Buyer' : 'Seller';
		const result = await db.executeProcedure('GetUnreadMessageCount', { UserId, Role: role });
		const count = result.recordset?.[0]?.UnreadCount || 0;
		return res.status(200).json({ count });
	} catch (error) {
		console.error('Error fetching unread count:', error);
		return res.status(500).json({ count: 0 });
	}
});

/**
 * GET /messages/conversations
 * Returns all conversations for the current user
 */
messageRouter.get('/conversations', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const role = req.query.role === 'Buyer' ? 'Buyer' : 'Seller';
		const result = await db.executeProcedure('GetConversations', { UserId, Role: role });
		return res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Error fetching conversations:', error);
		return res.status(500).json({ success: false, message: 'Failed to load conversations.' });
	}
});

/**
 * POST /messages/conversations
 * Get or create a conversation (buyer initiates from product/order page)
 */
messageRouter.post('/conversations', authenticateToken, async (req, res) => {
	try {
		const buyerId = req.user.id;
		const { sellerId, contextType, contextId, contextData } = req.body;

		if (!sellerId || !contextType || !contextId) {
			return res.status(400).json({ success: false, message: 'sellerId, contextType, and contextId are required.' });
		}
		if (!['product', 'order'].includes(contextType)) {
			return res.status(400).json({ success: false, message: 'contextType must be product or order.' });
		}

		const result = await db.executeProcedure('GetOrCreateConversation', {
			BuyerId: buyerId,
			SellerId: sellerId,
			ContextType: contextType,
			ContextId: contextId,
			ContextData: contextData ? JSON.stringify(contextData) : null,
		});

		const conv = result.recordset?.[0];
		if (!conv) return res.status(500).json({ success: false, message: 'Failed to get/create conversation.' });

		return res.status(200).json({ success: true, data: conv });
	} catch (error) {
		console.error('Error creating conversation:', error);
		return res.status(500).json({ success: false, message: 'Failed to create conversation.' });
	}
});

/**
 * GET /messages/conversations/:conversationId
 * Get all messages in a conversation
 */
messageRouter.get('/conversations/:conversationId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { conversationId } = req.params;
		const offset = parseInt(req.query.offset || '0', 10);
		const limit  = parseInt(req.query.limit  || '50', 10);

		// Mark messages as read when fetching
		await db.executeProcedure('MarkMessagesRead', { ConversationId: conversationId, UserId });

		const result = await db.executeProcedure('GetMessages', {
			ConversationId: conversationId,
			UserId,
			Offset: offset,
			Limit: limit,
		});

		const messages = (result.recordset || []).map((m) => ({
			...m,
			MediaUrls: m.MediaUrls ? JSON.parse(m.MediaUrls) : [],
		}));

		return res.status(200).json({ success: true, data: messages });
	} catch (error) {
		console.error('Error fetching messages:', error);
		const msg = error.message || 'Failed to fetch messages.';
		return res.status(msg.includes('not found') ? 404 : 500).json({ success: false, message: msg });
	}
});

/**
 * POST /messages/conversations/:conversationId
 * Send a message (text + optional media)
 */
messageRouter.post(
	'/conversations/:conversationId',
	authenticateToken,
	upload.array('media', MAX_MEDIA_FILES),
	async (req, res) => {
		try {
			const SenderId = req.user.id;
			const { conversationId } = req.params;
			const content = (req.body?.content || '').trim();
			const files   = req.files || [];

			if (!content && files.length === 0) {
				return res.status(400).json({ success: false, message: 'Message must have text or media.' });
			}

			// Upload media files
			const mediaUrls = [];
			for (const file of files) {
				const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'chat');
				mediaUrls.push({
					url,
					type: file.mimetype?.startsWith('video/') ? 'video' : 'image',
				});
			}

			const MessageId = uuidv4();
			const result = await db.executeProcedure('SendMessage', {
				MessageId,
				ConversationId: conversationId,
				SenderId,
				Content: content || null,
				MediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
			});

			const message = result.recordset?.[0];
			if (!message) return res.status(500).json({ success: false, message: 'Failed to send message.' });

			return res.status(201).json({
				success: true,
				data: { ...message, MediaUrls: mediaUrls },
			});
		} catch (error) {
			console.error('Error sending message:', error);
			const msg = error.message || 'Failed to send message.';
			return res.status(400).json({ success: false, message: msg });
		}
	}
);

export default messageRouter;
