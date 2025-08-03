import express from 'express';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import validateSchema from '../middlewares/validateSchema.js';

const productRouter = express.Router();
const db = new DbHelper();

productRouter.get('/all', async (req, res) => {
	try {
		let results = await db.executeProcedure('GetProductsToDisplay', {});

		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
productRouter.get('/product/details/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const result = await db.executeProcedure('GetProductDetails', { ProductId: id });

		// Guard against empty or invalid result
		if (!result || !result.recordset || result.recordset.length === 0) {
			return res.status(404).json({ message: 'No product was found with that id' });
		}

		// Extract product
		const product = result.recordset[0];

		// Parse ProductImages JSON safely
		if (product.ProductImages) {
			try {
				product.ProductImages = JSON.parse(product.ProductImages);
			} catch (e) {
				product.ProductImages = [];
			}
		}

		res.status(200).json(product);
	} catch (error) {
		console.error('Something went wrong, pertaining: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

productRouter.get('/product/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductById', { ProductId: id });
		if (!foundProduct) {
			res.status(404).json({ message: 'No product was found with that id' });
		}

		res.status(200).json(foundProduct.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
productRouter.get('/category/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const foundProduct = await db.executeProcedure('GetProductsFromCategory', { CategoryId: id });
		if (!foundProduct || foundProduct.recordset.length == 0) {
			return res.status(404).json({ message: 'No product was found from that category' });
		}

		res.status(200).json(foundProduct.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

export default productRouter;
