import express from 'express';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import validateSchema from '../middlewares/validateSchema.js';
import { newCategorySchema } from '../validator/joiValidations.js';

const categoryRouter = express.Router();
const db = new DbHelper();

categoryRouter.post('/add-category', validateSchema(newCategorySchema), async (req, res) => {
	try {
		const { CategoryName, Description } = req.body;

		const result = await db.executeProcedure('GetCategoryByName', { CategoryName });
		if (result.recordset.length > 0) {
			return res.status(400).json({ message: 'There is a category already with that name' });
		}
		const categoryId = uid();
		await db.executeProcedure('UpsertCategory', {
			CategoryId: categoryId,
			CategoryName,
			Description,
		});
		res.status(200).json({ message: `${CategoryName} has been added successfully` });
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
categoryRouter.get('/all', async (req, res) => {
	try {
		let results = await db.executeProcedure('GetAllCategories', {});
		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Error fetching Categories:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});
export default categoryRouter;
