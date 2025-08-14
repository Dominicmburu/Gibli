import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import { loginUserSchema, registerSellerSchema, registerUserSchema } from '../validator/joiValidations.js';
import validateSchema from '../middlewares/validateSchema.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const userRouter = express.Router();
const db = new DbHelper();

userRouter.post('/register', validateSchema(registerUserSchema), async (req, res) => {
	try {
		const { Email, Username, Password, ConfirmPassword } = req.body;

		// Check if the email already exists
		const existingEmail = await db.executeProcedure('GetUserByEmail', { Email });
		//console.log('--------This is the existing email we found', existingEmail.recordset);
		if (existingEmail.recordset.length > 0) {
			console.log('--------Email is already in use', existingEmail.recordset);
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

// Login route
userRouter.post('/login', validateSchema(loginUserSchema), async (req, res) => {
	try {
		const { Email, Password } = req.body;

		// Fetch user from DB
		const result = await db.executeProcedure('GetUserByEmail', { Email });

		if (result.recordset.length === 0) {
			return res.status(400).json({ message: 'Invalid email or password' });
		}

		const user = result.recordset[0];

		// Check password
		const isValid = await bcrypt.compare(Password, user.PasswordHash);
		if (!isValid) {
			return res.status(400).json({ message: 'Invalid email or password' });
		}

		// Create JWT payload
		const payload = {
			id: user.UserId,
			email: user.Email,
			username: user.Username,
			role: user.Role,
		};

		// Sign JWT
		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: '2h',
		});

		res.status(200).json({
			message: 'Login successful',
			token,
			user: payload,
		});
	} catch (error) {
		console.error('Login failed:', error);
		res.status(500).json({ message: 'Login failed', error: error.message });
	}
});

userRouter.post('/register-seller/:id', authenticateToken, validateSchema(registerSellerSchema), async (req, res) => {
	try {
		const UserId = req.user.id;
		const { BusinessNumber, BusinessName, Country } = req.body;

		// Check if the business number already exists
		const result = await db.executeProcedure('CheckBusinessDetails', { BusinessNumber, BusinessName });
		if (result.recordset) {
			console.log(result.recordset);

			return res.status(400).json({ message: 'Business name or number already in use' });
		}

		await db.executeProcedure('RegisterSeller', {
			UserId,
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

userRouter.delete('/delete/user/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const foundUser = await db.executeProcedure('GetUserById', { UserId: id });
		if (!foundUser) {
			res.status(404).json({ message: 'No user was found with that id' });
		}
		await db.executeProcedure('DeleteUser', { UserId: id });
		res.status(200).json({ message: `${foundUser.recordset[0].Email} has been deleted successfully` });
	} catch (error) {
		console.error('Something went wwrong', error);
		res.status(500).json({ message: 'Internal server Error' });
	}
});
export default userRouter;
