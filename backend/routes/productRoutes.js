import express from 'express';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import validateSchema from '../middlewares/validateSchema.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

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
productRouter.get('/search', async (req, res) => {
	try {
		const { q } = req.query;
		// Handle null, undefined, or empty string
		if (!q || q.trim().length === 0) {
			return res.json({
				results: [],
				count: 0,
				message: 'Please enter a search term',
			});
		}
		if (!q || q.trim().length < 2) {
			return res.status(400).json({
				error: 'Search term must be at least 2 characters',
			});
		}

		let result = await db.executeProcedure('SearchProducts', { SearchTerm: q.trim() });

		res.json({
			results: result.recordset,
			count: result.recordset.length,
		});
	} catch (error) {
		console.error('Search error:', error);
		res.status(500).json({
			error: 'Search failed. Please try again.',
		});
	}
});
productRouter.get('/similar', async (req, res) => {
	const id = req.params;
	try {
		let results = await db.executeProcedure('GetProductById', {});

		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
productRouter.get('/myproducts', authenticateToken, async (req, res) => {
	try {
		const id = req.user.id;

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
productRouter.get('/paginated', async (req, res) => {
	const { searchTerm, categoryId, limit = 10, page = 1 } = req.query;
	try {
		const offset = (page - 1) * limit;
		let results = await db.executeProcedure('GetProductsPaginated', {
			limit: parseInt(limit),
			offset: parseInt(offset),
			searchTerm: searchTerm ? searchTerm : null,
			categoryId: categoryId ? parseInt(categoryId) : null,
		});

		res.status(200).json({
			success: true,
			count: results.recordset.length,
			data: results.recordset,
		});
	} catch (error) {
		console.error('Error fetching paginated products:', error);
		res.status(500).json({
			success: false,
			message: `Something went wrong: ${error.message}`,
		});
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
