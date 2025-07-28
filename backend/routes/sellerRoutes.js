import express from 'express';
import upload from '../middlewares/multerSetup.js';
import { uploadToS3 } from '../services/s3UploadService.js';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import DbHelper from '../db/dbHelper.js';

const sellerRouter = express.Router();
const db = new DbHelper();

// sellerRouter.post('/upload/product', upload.array('images', 4), async (req, res) => {
// 	try {
// 		console.log('CHECK WHAT THE BODY LOOKS LIKE:', req.body);
// 		// 1️⃣ Validate uploaded images
// 		if (!req.files || req.files.length !== 4) {
// 			return res.status(400).json({ error: 'You must upload exactly 4 images of the product.' });
// 		}

// 		// 2️⃣ Extract and validate product fields
// 		const { CategoryId, UserId, ProductName, Description, InStock, Price } = req.body;

// 		// if (!CategoryId || !UserId || !ProductName || !Description || !InStock || !Price) {
// 		// 	return res.status(400).json({ error: 'Missing required product fields.' });
// 		// }

// 		const ProductId = uuidv4(); // generate ProductId

// 		// 3️⃣ Upload images to S3 and prepare image records
// 		const imageRecords = [];
// 		for (const file of req.files) {
// 			const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'products');
// 			imageRecords.push({
// 				ImageId: uuidv4(),
// 				ImageUrl: url,
// 			});
// 		}

// 		// 4️⃣ Call the stored procedure with transaction-safe insert
// 		await db.executeProcedure('UploadProductWithImages', {
// 			ProductId,
// 			CategoryId,
// 			UserId,
// 			ProductName,
// 			Description,
// 			InStock: parseInt(InStock),
// 			Price: parseFloat(Price),
// 			Images: {
// 				type: 'ProductImageTableType',
// 				value: imageRecords,
// 			},
// 		});

// 		// 5️⃣ Respond with success
// 		res.status(201).json({
// 			message: 'Product created with images',
// 			ProductId,
// 			imageUrls: imageRecords.map((img) => img.ImageUrl),
// 		});
// 	} catch (error) {
// 		console.error('Product upload failed:', error);
// 		res.status(500).json({ error: error.message || 'Internal Server Error' });
// 	}
// });
sellerRouter.post('/upload/product', upload.array('images', 4), async (req, res) => {
	try {
		if (!req.files || req.files.length !== 4) {
			return res.status(400).json({ error: 'You must upload exactly 4 images of the product.' });
		}

		const { CategoryId, UserId, ProductName, Description, InStock, Price } = req.body;
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

		// ✅ Construct TVP (Table-Valued Parameter)
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
			UserId,
			ProductName,
			Description,
			InStock: parseInt(InStock),
			Price: parseFloat(Price),
			Images: imageTable, // 🧠 Properly structured table input
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

export default sellerRouter;
