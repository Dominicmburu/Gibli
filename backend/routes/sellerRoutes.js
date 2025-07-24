import express from 'express';
import upload from '../middlewares/multerSetup.js';
import { uploadToS3 } from '../services/s3UploadService.js';

const sellerRouter = express.Router();

sellerRouter.post('/upload/product', upload.single('image'), async (req, res) => {
	try {
		// Check if image is actually uploaded
		if (!req.file) {
			return res.status(400).json({ error: 'No image uploaded' });
		}

		const fileBuffer = req.file.buffer;
		const originalName = req.file.originalname;
		const mimeType = req.file.mimetype;

		// Upload to S3 under the "products" folder

		const imageUrl = await uploadToS3(fileBuffer, originalName, mimeType, 'products');

		// Send back the image URL to be stored in the product database entry
		return res.status(201).json({
			message: 'Product image uploaded successfully',
			imageUrl,
		});
	} catch (error) {
		console.error('Error uploading product image:', error);
		return res.status(500).json({ error: 'Something went wrong uploading the image' });
	}
});
sellerRouter.post('/upload/review', async (req, res) => {});

export default sellerRouter;
