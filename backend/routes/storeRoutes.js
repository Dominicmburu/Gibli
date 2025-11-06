import express from 'express';
import DbHelper from '../db/dbHelper.js';
import { v4 } from 'uuid';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const db = new DbHelper();

const storeRouter = express.Router();

storeRouter.get('/store-details', authenticateToken, async (req, res) => {
	try {
		const id = req.user.id;

		const foundStore = await db.executeProcedure('GetStoreInfoFromId', { UserId: id });
		if (!foundStore) {
			res.status(404).json({ message: 'No store was found associated with that Userid' });
		}

		res.status(200).json(foundStore.recordset);
	} catch (error) {
		console.error('Something went wrong, pertainig: ', error);
		res.status(500).json({ message: `Something went wrong: ${error.message}` });
	}
});
export default storeRouter;
