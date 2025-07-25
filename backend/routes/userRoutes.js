import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import { registerSellerSchema, registerUserSchema } from '../validator/joiValidations.js';
import validateSchema from '../middlewares/validateSchema.js';

const userRouter = express.Router();
const db = new DbHelper();

userRouter.post('/register', validateSchema(registerUserSchema), async (req, res) => {
	try {
		const { Email, Username, Password, ConfirmPassword } = req.body;

		// Check if the email already exists
		const existingEmail = await db.executeProcedure('GetUserByEmail', { Email });
		console.log('--------This is the existing email we found', existingEmail.recordset);
		if (existingEmail.recordset.length > 0) {
			return res.status(400).json({ message: 'Email is already in use' });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(Password, 10);
		const userId = uid();
		// Execute stored procedure and retrieve the new UserID
		await db.executeProcedure('CreateUser', {
			UserId: userId,
			Email,
			Username,
			PasswordHash: hashedPassword,
		});

		res.status(201).json({
			message: `User ${Email} has been created successfully`,
		});

		//await sendWelcomeEmail(Email);
	} catch (error) {
		console.error('Error happened ', error);
		res.status(500).json({ message: `${error.message}` });
	}
});
userRouter.post('/register-seller/:id', validateSchema(registerSellerSchema), async (req, res) => {
	try {
		const { id } = req.params;
		const { BusinessNumber, BusinessName, Country } = req.body;

		// Check if the business number already exists
		const result = await db.executeProcedure('CheckBusinessDetails', { BusinessNumber, BusinessName });
		if (result.length > 0) {
			console.log(result.recordset);

			return res.status(400).json({ message: 'Some  is already in use' });
		}

		await db.executeProcedure('RegisterSeller', {
			UserId: id,
			BusinessNumber,
			BusinessName,
			Country,
		});

		res.status(201).json({
			message: `${BusinessName} is now a registered seller`,
		});

		//await sendSellerWelcomeEmail(Email);
	} catch (error) {
		console.error('Error happened ', error);
		res.status(500).json({ message: `${error.message}` });
	}
});

userRouter.get('/all', async (req, res) => {
	try {
		let results = await db.executeProcedure('GetAllUsers', {});
		res.status(200).json(results.recordset);
	} catch (error) {
		console.error('Error fetching users:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

export default userRouter;
