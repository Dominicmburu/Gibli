import DbHelper from '../dbHelper.js';
import { v4 as uid } from 'uuid';
const db = new DbHelper();
async function addMissingOtherForAllCategories() {
	try {
		// Get all categories
		const categories = await db.executeProcedure(`GetAllCategories`, {});

		for (const c of categories.recordset) {
			// Always generate ID in Node
			const newId = uid();

			await db.executeProcedure('EnsureOtherSubCategory', {
				CategoryId: c.CategoryId,
				SubCategoryId: newId,
			});

			console.log(`Ensured 'Other' exists for category: ${c.CategoryId}`);
		}

		console.log('All done!');
	} catch (err) {
		console.error(err);
	}
}

addMissingOtherForAllCategories();
