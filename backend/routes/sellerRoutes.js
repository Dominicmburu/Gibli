import express from 'express';
import upload from '../middlewares/multerSetup.js';
import { uploadToS3, deleteMultipleFromS3 } from '../services/s3UploadService.js';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { sendRestockNotificationEmail } from '../services/emailService.js';
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

		// Capture previous stock before update to detect restock
		const prevProduct = foundProduct.recordset[0];
		const wasOutOfStock = prevProduct.InStock <= 0;
		const newStock = parseInt(InStock);

		const result = await db.executeProcedure('UpdateProduct', {
			ProductId: id,
			ProductName,
			CategoryId,
			SubCategoryId,
			Price: parseFloat(Price),
			Description,
			InStock: newStock,
			ShippingPrice: parseFloat(ShippingPrice),
			ExpressShippingPrice: parseFloat(ExpressShippingPrice),
			LowStockThreshold: LowStockThreshold != null ? parseInt(LowStockThreshold) : null,
		});

		const updated = result.recordset?.[0];
		res.status(200).json({ success: true, message: `Product updated successfully`, data: updated });

		// Fire restock notifications if product was out of stock and now has stock (fire-and-forget)
		if (wasOutOfStock && newStock > 0) {
			(async () => {
				try {
					const remindersResult = await db.executeProcedure('GetRestockRemindersByProduct', { ProductId: id });
					const reminders = remindersResult.recordset || [];
					if (reminders.length === 0) return;

					const productName = ProductName || prevProduct.ProductName;
					const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

					for (const r of reminders) {
						await sendRestockNotificationEmail(r.Email, r.Username, productName, id, frontendUrl);
					}

					// Clear all reminders for this product now that buyers are notified
					await db.executeProcedure('DeleteRestockRemindersByProduct', { ProductId: id });
					console.log(`[RESTOCK] Notified ${reminders.length} buyer(s) for product ${id}`);
				} catch (err) {
					console.error('[RESTOCK] Failed to send restock notifications:', err.message);
				}
			})();
		}
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
// Get count of products needing restock (for sidebar badge)
sellerRouter.get('/restock-count', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const result = await db.executeProcedure('GetRestockCount', { UserId });
		const count = result.recordset?.[0]?.RestockCount ?? 0;
		res.status(200).json({ success: true, count });
	} catch (error) {
		console.error('Error fetching restock count:', error);
		res.status(500).json({ success: false, count: 0 });
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

sellerRouter.get('/store-info', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const result = await db.executeProcedure('GetSellerStoreInfo', { SellerId: sellerId });
		const row = result.recordset?.[0];
		if (!row) return res.status(404).json({ error: 'Store not found.' });
		return res.status(200).json({ success: true, data: row });
	} catch (error) {
		console.error('Get store info error:', error);
		return res.status(500).json({ error: 'Failed to load store info.' });
	}
});

sellerRouter.patch('/store-info', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { businessName, returnAddress } = req.body || {};
		if (!businessName?.trim()) {
			return res.status(400).json({ error: 'Business name is required.' });
		}
		await db.executeProcedure('UpdateSellerProfile', {
			SellerId: sellerId,
			BusinessName: businessName.trim(),
			ReturnAddress: returnAddress?.trim() || null,
		});
		return res.status(200).json({ success: true, message: 'Store profile updated.' });
	} catch (error) {
		console.error('Update store info error:', error);
		return res.status(500).json({ error: 'Failed to update store info.' });
	}
});

export default sellerRouter;
