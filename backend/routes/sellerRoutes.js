import express from 'express';
import upload from '../middlewares/multerSetup.js';
import { uploadToS3, deleteMultipleFromS3 } from '../services/s3UploadService.js';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import DbHelper from '../db/dbHelper.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const sellerRouter = express.Router();
const db = new DbHelper();

sellerRouter.post('/upload/product/', authenticateToken, upload.array('images'), async (req, res) => {
	try {
		if (!req.files || !(req.files.length <= 4)) {
			return res.status(400).json({ error: 'You must upload at most 4 images of the product.' });
		}
		const UserId = req.user.id;

		const {
			CategoryId,
			SubCategoryId,
			ProductName,
			Description,
			InStock,
			Price,
			ShippingPrice,
			ExpressShippingPrice,
			LowStockThreshold,
		} = req.body;
		// const { CategoryId, UserId, ProductName, Description, InStock, Price } = req.body;
		const ProductId = uuidv4();

		// Upload to S3
		const imageRecords = [];
		for (const file of req.files) {
			const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'products');
			imageRecords.push({
				ImageId: uuidv4(),
				ImageUrl: url,
			});
		}

		// Construct TVP (Table-Valued Parameter)
		const imageTable = new sql.Table(); // no need to pass name here
		imageTable.columns.add('ImageId', sql.VarChar(50));
		imageTable.columns.add('ImageUrl', sql.VarChar(sql.MAX));

		for (const record of imageRecords) {
			imageTable.rows.add(record.ImageId, record.ImageUrl);
		}

		// Call SP
		await db.executeProcedure('UploadProductWithImages', {
			ProductId,
			CategoryId,
			SubCategoryId,
			UserId,
			ProductName,
			Description,
			InStock: parseInt(InStock),
			Price: parseFloat(Price),
			ShippingPrice: parseFloat(ShippingPrice),
			ExpressShippingPrice: parseFloat(ExpressShippingPrice),
			LowStockThreshold: parseInt(LowStockThreshold) || 5,
			Images: imageTable, //  Properly structured table input
		});

		res.status(201).json({
			message: 'Product created with images',
			ProductId,
			imageUrls: imageRecords.map((img) => img.ImageUrl),
		});
	} catch (error) {
		console.error('Product upload failed:', error);
		res.status(500).json({ error: error.message || 'Internal Server Error' });
	}
});

sellerRouter.patch('/update/product/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct || !foundProduct.recordset || foundProduct.recordset.length === 0) {
			return res.status(404).json({ message: 'No product was found with that id' });
		}

		const { ProductName, CategoryId, SubCategoryId, Price, Description, InStock, ShippingPrice, ExpressShippingPrice, LowStockThreshold } = req.body;
		const result = await db.executeProcedure('UpdateProduct', {
			ProductId: id,
			ProductName,
			CategoryId,
			SubCategoryId,
			Price: parseFloat(Price),
			Description,
			InStock: parseInt(InStock),
			ShippingPrice: parseFloat(ShippingPrice),
			ExpressShippingPrice: parseFloat(ExpressShippingPrice),
			LowStockThreshold: LowStockThreshold != null ? parseInt(LowStockThreshold) : null,
		});

		const updated = result.recordset?.[0];
		res.status(200).json({ success: true, message: `Product updated successfully`, data: updated });
	} catch (error) {
		console.error('Product update failed:', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

// Get all images for a product
sellerRouter.get('/product-images/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		const result = await db.executeProcedure('GetProductImages', { ProductId: id });
		res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Error fetching product images:', error);
		res.status(500).json({ success: false, message: 'Failed to fetch product images.' });
	}
});

// Delete a specific product image
sellerRouter.delete('/product-image/:imageId', authenticateToken, async (req, res) => {
	try {
		const { imageId } = req.params;
		const UserId = req.user.id;

		const result = await db.executeProcedure('DeleteProductImage', {
			ImageId: imageId,
			UserId,
		});

		const imageUrl = result.recordset?.[0]?.ImageUrl;
		if (imageUrl) {
			try {
				await deleteMultipleFromS3([imageUrl]);
			} catch (s3Error) {
				console.error('S3 deletion error (non-fatal):', s3Error);
			}
		}

		res.status(200).json({ success: true, message: 'Image deleted successfully.' });
	} catch (error) {
		console.error('Error deleting product image:', error);
		const message = error.message || 'Failed to delete image.';
		res.status(400).json({ success: false, message });
	}
});

// Add images to an existing product
sellerRouter.post('/product-images/:id', authenticateToken, upload.array('images'), async (req, res) => {
	try {
		const { id } = req.params;
		const UserId = req.user.id;

		// Verify product ownership
		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct?.recordset?.length) {
			return res.status(404).json({ success: false, message: 'Product not found.' });
		}

		// Check current image count
		const currentImages = await db.executeProcedure('GetProductImages', { ProductId: id });
		const currentCount = currentImages.recordset?.length || 0;
		const newCount = req.files?.length || 0;

		if (currentCount + newCount > 4) {
			return res.status(400).json({
				success: false,
				message: `Cannot add ${newCount} images. Product already has ${currentCount} image(s). Maximum is 4.`,
			});
		}

		if (!req.files || newCount === 0) {
			return res.status(400).json({ success: false, message: 'No images provided.' });
		}

		// Upload to S3 and insert into DB via SP
		for (const file of req.files) {
			const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'products');
			await db.executeProcedure('AddProductImage', {
				ImageId: uuidv4(),
				ProductId: id,
				UserId,
				ImageUrl: url,
			});
		}

		// Fetch updated images list
		const updatedImages = await db.executeProcedure('GetProductImages', { ProductId: id });

		res.status(201).json({
			success: true,
			message: `${newCount} image(s) added successfully.`,
			data: updatedImages.recordset || [],
		});
	} catch (error) {
		console.error('Error adding product images:', error);
		res.status(500).json({ success: false, message: 'Failed to add images.' });
	}
});

// Toggle NeedsRestock flag on a product
sellerRouter.patch('/toggle-restock/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		const UserId = req.user.id;

		const result = await db.executeProcedure('ToggleNeedsRestock', {
			ProductId: id,
			UserId,
		});

		const updated = result.recordset?.[0];
		if (!updated) {
			return res.status(404).json({ success: false, message: 'Product not found.' });
		}

		res.status(200).json({
			success: true,
			message: updated.NeedsRestock ? 'Product marked as needs restocking.' : 'Restock flag removed.',
			data: updated,
		});
	} catch (error) {
		console.error('Toggle restock failed:', error);
		const message = error.message || 'Failed to toggle restock flag.';
		res.status(400).json({ success: false, message });
	}
});

// Get all products flagged as needing restock
sellerRouter.get('/needs-restock', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const result = await db.executeProcedure('GetNeedsRestockProducts', { UserId });
		res.status(200).json({ success: true, data: result.recordset || [] });
	} catch (error) {
		console.error('Error fetching restock products:', error);
		res.status(500).json({ success: false, message: 'Failed to fetch restock products.' });
	}
});
// sellerRouter.js
sellerRouter.patch('/snooze/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const result = await db.executeProcedure('ToggleSellerVerification', { UserId: id });

		const updatedSeller = result.recordset[0];
		if (!updatedSeller) {
			return res.status(404).json({ message: 'Seller not found.' });
		}

		const statusText =
			updatedSeller.IsVerified === true || updatedSeller.IsVerified === 1 ? 'Activated' : 'Snoozed';

		res.status(200).json({
			message: `Store has been ${statusText} successfully.`,
			data: updatedSeller,
		});
	} catch (error) {
		console.error('Error toggling seller status:', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

sellerRouter.delete('/delete/product/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;

		// 1. Get product details
		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct || !foundProduct.recordset || foundProduct.recordset.length === 0) {
			return res.status(404).json({ message: 'No product was found with that id' });
		}

		// 2. Get all associated images
		const productImages = await db.executeProcedure('GetProductImages', { ProductId: id });
		const imageUrls = productImages.recordset.map((img) => img.ImageUrl);

		// 3. Delete from database first (this should cascade delete images if FK is set up)
		await db.executeProcedure('DeleteProduct', { ProductId: id });

		// 4. Delete images from S3
		if (imageUrls.length > 0) {
			try {
				const deleteResult = await deleteMultipleFromS3(imageUrls);
				console.log(`S3 cleanup: ${deleteResult.successful}/${deleteResult.total} images deleted`);

				if (deleteResult.failed > 0) {
					console.warn(`Warning: ${deleteResult.failed} images failed to delete from S3`);
				}
			} catch (s3Error) {
				// Log error but don't fail the request since DB deletion succeeded
				console.error('S3 deletion error:', s3Error);
			}
		}

		res.status(200).json({
			message: `${foundProduct.recordset[0].Name} has been deleted successfully`,
			imagesDeleted: imageUrls.length,
		});
	} catch (error) {
		console.error('Product deletion error:', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

export default sellerRouter;
