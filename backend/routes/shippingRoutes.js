import express from 'express';
import { v4 } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
const shippingRouter = express();

const db = new DbHelper();

shippingRouter.post('/add-shipping', authenticateToken, async (req, res) => {
	const { FullName, PhoneNumber, AddressLine1, AddressLine2, City, StateOrProvince, PostalCode, Country, IsDefault } =
		req.body;

	const UserId = req.user.id;

	try {
		const ShippingId = v4();
		await db.executeProcedure('AddShippingDetail', {
			ShippingId,
			UserId,
			FullName,
			PhoneNumber,
			AddressLine1,
			AddressLine2, //not required can be null
			City,
			StateOrProvince, //not required can be null
			PostalCode, //not required can be null
			Country,
			IsDefault,
		});
		res.status(201).json({ message: 'Your new Shipping Address has been added successfully.' });
	} catch (error) {
		console.error('Error adding shipping detail:', error);
		res.status(500).json({ error: 'An error occurred while adding shipping detail.' });
	}
});

shippingRouter.get('/default-address/me', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const result = await db.executeProcedure('GetDefaultShipping', { UserId });
		const defaultShipping = result.recordset;
		if (defaultShipping.length != 0) {
			res.status(200).json(defaultShipping);
			return;
		}
		res.status(200).json(defaultShipping);
	} catch (error) {
		console.error('Error fetching default shipping address:', error);
		res.status(500).json({ message: 'Error fetching default shipping address.', error: error.message });
	}
});
shippingRouter.get('/addresses/me', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const result = await db.executeProcedure('GetShippingDetailsByUser', { UserId });
		if (result.recordset.length != 0) {
			res.status(200).json(result.recordset);
		}
		res.status(200).json(result.recordset);
	} catch (error) {
		console.error('Something happened', error);
		res.status(500).json({ message: 'Something went wrong', error: error.message });
	}
});
shippingRouter.patch('/set-as-default/:ShippingId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { ShippingId } = req.params;
		await db.executeProcedure('SetDefaultShipping', { ShippingId, UserId });
		res.status(200).json({ message: 'Address has been updated' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Something went wrong', error: error.message });
	}
});
shippingRouter.patch('/edit-address/:ShippingId', authenticateToken, async (req, res) => {
	try {
		const UserId = req.user.id;
		const { ShippingId } = req.params;
		const {
			FullName,
			PhoneNumber,
			AddressLine1,
			AddressLine2,
			City,
			StateOrProvince,
			PostalCode,
			Country,
			IsDefault,
		} = req.body;

		// ✅ Validate presence of key fields (optional)
		// if (!FullName || !PhoneNumber || !AddressLine1 || !City || !Country) {
		// 	return res.status(400).json({ message: 'Missing required address details.' });
		// }

		await db.executeProcedure('UpdateShippingDetail', {
			ShippingId,
			UserId,
			FullName,
			PhoneNumber,
			AddressLine1,
			AddressLine2,
			City,
			StateOrProvince,
			PostalCode,
			Country,
			IsDefault,
		});

		res.status(200).json({ message: 'Address has been updated successfully.' });
	} catch (error) {
		console.error('❌ Edit Address Error:', error);
		res.status(500).json({ message: 'Something went wrong', error: error.message });
	}
});

shippingRouter.delete('/delete-address/:ShippingId', authenticateToken, async (req, res) => {
	try {
		const { ShippingId } = req.params;
		await db.executeProcedure('DeleteShippingDetail', { ShippingId });
		res.status(200).json({ message: 'Address has been deleted' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Something went wrong', error: error.message });
	}
});

export default shippingRouter;
