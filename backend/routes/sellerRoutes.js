import express from 'express';
import upload from '../middlewares/multerSetup.js';
import { uploadToS3 } from '../services/s3UploadService.js';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import DbHelper from '../db/dbHelper.js';

const sellerRouter = express.Router();
const db = new DbHelper();

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
			UserId,
			ProductName,
			Description,
			InStock: parseInt(InStock),
			Price: parseFloat(Price),
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
sellerRouter.get('/myproducts/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductsBySeller', { UserId: id });
		if (!foundProduct) {
			res.status(404).json({ message: 'No products were found for you/user with that id' });
		}

		res.status(200).json(foundProduct.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
sellerRouter.patch('/update/product/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct) {
			res.status(404).json({ message: 'No product was found with that id' });
		}

		const { ProductName, CategoryId, Price, Description, InStock } = req.body;
		await db.executeProcedure('UpdateProduct', {
			ProductId: id,
			ProductName,
			CategoryId,
			Price,
			Description,
			InStock,
		});
		res.status(200).json({ message: `Product ${ProductName} has been Updated successfully` });
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
sellerRouter.delete('/delete/product/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct) {
			res.status(404).json({ message: 'No product was found with that id' });
		}
		await db.executeProcedure('DeleteProduct', { ProductId: id });
		//------------SUPPOSED TO ALSO DELETE ASSOCIATED IMAGES FROM S3 ---------ADD THAT LATER
		res.status(200).json({ message: `${foundProduct.recordset[0].Name} has been deleted successfully` });
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

export default sellerRouter;
