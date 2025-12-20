import express from 'express';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import validateSchema from '../middlewares/validateSchema.js';
import { newCategorySchema } from '../validator/joiValidations.js';

const categoryRouter = express.Router();
const db = new DbHelper();

categoryRouter.post('/add-category', validateSchema(newCategorySchema), async (req, res) => {
	try {
		const { CategoryName } = req.body;

		// Check if category exists
		const result = await db.executeProcedure('GetCategoryByName', { CategoryName });
		if (result.recordset.length > 0) {
			return res.status(400).json({ message: 'There is a category already with that name' });
		}

		const categoryId = uid();

		// Create category
		await db.executeProcedure('UpsertCategory', {
			CategoryId: categoryId,
			CategoryName,
		});

		// Auto-create mandatory sub-category "Other"
		await db.executeProcedure('UpsertSubCategory', {
			SubCategoryId: uid(),
			CategoryId: categoryId,
			SubCategoryName: 'Other',
		});

		res.status(200).json({ message: `${CategoryName} has been added successfully` });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: error.message });
	}
});

categoryRouter.post('/add-sub-category', async (req, res) => {
	try {
		const { SubCategoryName, CategoryId } = req.body;

		const result = await db.executeProcedure('GetSubCategoryByName', {
			SubCategoryName,
			CategoryId,
		});

		if (result.recordset.length > 0) {
			return res
				.status(400)
				.json({ message: 'There is a sub-category already with that name for this category' });
		}

		await db.executeProcedure('UpsertSubCategory', {
			SubCategoryId: uid(),
			SubCategoryName,
			CategoryId,
		});

		res.status(200).json({ message: `Sub category ${SubCategoryName} has been added successfully` });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: error.message });
	}
});

categoryRouter.get('/all-categories', async (req, res) => {
	try {
		let results = await db.executeProcedure('GetAllCategories', {});
		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Error fetching Categories:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
categoryRouter.get('/all-sub-categories', async (req, res) => {
	try {
		let results = await db.executeProcedure('GetAllSubCategories', {});
		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Error fetching Sub-Categories:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
categoryRouter.get('/all-sub-categories/:id', async (req, res) => {
	const { id } = req.params;
	try {
		let results = await db.executeProcedure('GetAllSubCategoriesOfCategory', { CategoryId: id });
		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Error fetching Sub-Categories:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
categoryRouter.get('/category-details/:id', async (req, res) => {
	try {
		const { id } = req.params;
		let results = await db.executeProcedure('GetCategoryById', { CategoryId: id });
		//if we get a recordset > 0 then it means we found something that exists in our db return it with status 200 else res.status 404
		if (results.recordset.length > 0) {
			return res.status(200).json(results.recordset[0]);
		}
		return res.status(404).json({ message: 'No category associated with that id' });
	} catch (error) {
		console.error('Error fetching Category details:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
categoryRouter.get('/sub-category-details/:id', async (req, res) => {
	try {
		const { id } = req.params;
		let results = await db.executeProcedure('GetSubCategoryById', { SubCategoryId: id });
		//if we get a recordset > 0 then it means we found something that exists in our db return it with status 200 else res.status 404
		if (results.recordset.length > 0) {
			return res.status(200).json(results.recordset[0]);
		}
		return res.status(404).json({ message: 'No sub-category associated with that id' });
	} catch (error) {
		console.error('Error fetching Sub-Categories details:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
categoryRouter.patch('/update-category/:categoryId', validateSchema(newCategorySchema), async (req, res) => {
	try {
		const { categoryId } = req.params;
		const { CategoryName } = req.body;

		const result = await db.executeProcedure('GetCategoryByName', { CategoryName });
		if (result.recordset.length > 0) {
			return res.status(400).json({ message: 'There is a category already with that name' });
		}
		await db.executeProcedure('UpsertCategory', {
			CategoryId: categoryId,
			CategoryName,
		});
		res.status(200).json({ message: `${CategoryName} has been updated successfully` });
	} catch (error) {
		console.error('Something went wrong, pertaining: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
categoryRouter.patch('/update-sub-category/:subCategoryId', async (req, res) => {
	try {
		const { subCategoryId } = req.params;
		const { SubCategoryName, CategoryId } = req.body;
		await db.executeProcedure('UpsertSubCategory', {
			SubCategoryId: subCategoryId,
			SubCategoryName,
			CategoryId,
		});
		res.status(200).json({ message: `Sub-category has been updated successfully` });
	} catch (error) {
		console.error('Something went wrong, pertaining: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
categoryRouter.delete('/delete-category/:categoryId', async (req, res) => {
	try {
		const { categoryId } = req.params;
		await db.executeProcedure('DeleteCategory', { CategoryId: categoryId });
		res.status(200).json({ message: `Category has been deleted successfully` });
	} catch (error) {
		console.error('Something went wrong, pertaining: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
categoryRouter.delete('/delete-sub-category/:subCategoryId', async (req, res) => {
	try {
		const { subCategoryId } = req.params;
		await db.executeProcedure('DeleteSubCategory', { SubCategoryId: subCategoryId });
		res.status(200).json({ message: `Sub-category has been deleted successfully` });
	} catch (error) {
		console.error('Something went wrong, pertaining: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});

export default categoryRouter;
