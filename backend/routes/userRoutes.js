import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uid } from 'uuid';
import DbHelper from '../db/dbHelper.js';
import {
	forgortPasswordSchema,
	loginUserSchema,
	registerSellerSchema,
	registerUserSchema,
	resetPasswordSchema,
} from '../validator/joiValidations.js';
import validateSchema from '../middlewares/validateSchema.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	sellerRegistrationEmail,
	sendForgotPasswordEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from '../services/emailService.js';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const userRouter = express.Router();
const db = new DbHelper();

userRouter.post('/register', validateSchema(registerUserSchema), async (req, res) => {
	try {
		const { Email, Username, Password } = req.body;

		const existingEmail = await db.executeProcedure('GetUserByEmail', { Email });
		if (existingEmail.recordset.length > 0) return res.status(400).json({ message: 'Email is already in use' });

		const hashedPassword = await bcrypt.hash(Password, 10);
		const userId = uid();
		const verificationToken = crypto.randomBytes(32).toString('hex');

		await db.executeProcedure('CreateUser', {
			UserId: userId,
			Email,
			Username,
			PasswordHash: hashedPassword,
			VerificationToken: verificationToken,
		});

		// Send verification email
		await sendVerificationEmail(Email, verificationToken);

		res.status(201).json({
			message: `Account created. Check your email '${Email}' for verification link. Before attempting to log in`,
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ message: error.message });
	}
});

userRouter.post('/login', validateSchema(loginUserSchema), async (req, res) => {
	try {
		const { Email, Password } = req.body;
		const result = await db.executeProcedure('GetUserByEmail', { Email });

		if (result.recordset.length === 0) return res.status(400).json({ message: 'Invalid email or password' });

		const user = result.recordset[0];
		const isValid = await bcrypt.compare(Password, user.PasswordHash);
		if (!isValid) return res.status(400).json({ message: 'Invalid email or password' });

		if (!user.IsEmailVerified)
			return res.status(403).json({ message: 'Please verify your email before logging in.' });

		const payload = { id: user.UserId, email: user.Email, username: user.Username, role: user.Role };
		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

		res.status(200).json({ message: 'Login successful', token, user: payload });
	} catch (error) {
		console.error('Login failed:', error);
		res.status(500).json({ message: 'Login failed', error: error.message });
	}
});
userRouter.get('/verify-email/:token', async (req, res) => {
	try {
		const { token } = req.params;
		const result = await db.executeProcedure('GetUserByVerificationToken', { VerificationToken: token });

		if (result.recordset.length === 0) return res.status(400).send('Invalid or expired verification link.');

		const user = result.recordset[0];
		await db.executeProcedure('VerifyUserEmail', { UserId: user.UserId });

		res.send('Email verified successfully! You can now close this page and log in.');
	} catch (error) {
		console.error(error);
		res.status(500).send('Error verifying email');
	}
});
userRouter.post('/resend-verification', async (req, res) => {
	try {
		const { Email } = req.body;
		const result = await db.executeProcedure('GetUserByEmail', { Email });

		if (result.recordset.length === 0)
			return res
				.status(200)
				.json({ message: 'If an account with that email exists, you will receive a reset link.' });

		const user = result.recordset[0];
		if (user.IsEmailVerified) return res.status(200).json({ message: 'Email already verified' });

		const newToken = crypto.randomBytes(32).toString('hex');
		await db.executeProcedure('UpdateVerificationToken', { Email, VerificationToken: newToken });
		await sendVerificationEmail(Email, newToken);

		res.status(200).json({ message: 'If an account with that email exists, you will receive a reset link.' });
	} catch (error) {
		console.error('Resend verification error:', error);
		res.status(500).json({ message: error.message });
	}
});
//Email Reset Link
userRouter.post('/forgot-password', validateSchema(forgortPasswordSchema), async (req, res) => {
	try {
		const { Email } = req.body;
		const result = await db.executeProcedure('GetUserByEmail', { Email });
		const foundUser = result.recordset[0];
		console.log(foundUser);
		if (!foundUser) {
			return res
				.status(200)
				.json({ message: 'If an account with that email exists, you will receive a reset link.' });
		}
		// Create JWT payload
		const payload = {
			id: foundUser.UserId,
			email: foundUser.Email,
			username: foundUser.Username,
			role: foundUser.Role,
		};

		// Sign JWT
		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: '5m',
		});
		const hashedToken = await bcrypt.hash(token, 10);
		const expireTime = new Date(Date.now() + 300000);
		const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
		await sendForgotPasswordEmail(foundUser.Email, resetUrl);
		await db.executeProcedure('InsertIntoResetRequest', {
			ResetId: uid(),
			UserId: foundUser.UserId,
			TokenHash: hashedToken,
			// ExpiresAt: expireTime,
		});
		return res
			.status(200)
			.json({ message: 'If an account with that email exists, you will receive a reset link.' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error.' });
	}
});

userRouter.patch('/reset-password', async (req, res) => {
	try {
		const { token, newPassword } = req.body;

		if (!token) {
			return res.status(400).json({ message: 'Access Token Missing' });
		}
		if (!newPassword) {
			return res.status(400).json({ message: 'Password field is required' });
		}
		// console.log('Token was found');

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const userId = decoded.id;

		const result = await db.executeProcedure('GetRequestsByUserId', { UserId: userId });

		const resetRequests = result.recordset;

		if (!resetRequests || resetRequests.length === 0) {
			return res.status(400).json({ message: 'No reset requests found for that user' });
		}

		// Try to match the token being used with one of the stored hashed Tokens
		let validRequest = null;
		for (const request of resetRequests) {
			const isMatch = await bcrypt.compare(token, request.TokenHash);
			if (isMatch) {
				validRequest = request;
				break;
			}
		}

		if (!validRequest) {
			return res.status(400).json({ message: 'Invalid token' });
		}

		// Hash and update new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await db.executeProcedure('UpdateUserPassword', {
			UserId: userId,
			PasswordHash: hashedPassword,
		});

		// clear the ResetRequest Table for all instances of this current user
		await db.executeProcedure('ClearUsersResetRequests', {
			UserId: userId,
		});

		return res.status(200).json({ message: 'Password successfully reset' });
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return res.status(400).json({ message: 'Token expired' });
		}
		return res.status(500).json({ message: 'Server Error' });
	}
});
//OG REGISTER ROUTE WITHOUT VERIFICATION LINK
// userRouter.post('/register', validateSchema(registerUserSchema), async (req, res) => {
// 	try {
// 		const { Email, Username, Password, ConfirmPassword } = req.body;

// 		// Check if the email already exists
// 		const existingEmail = await db.executeProcedure('GetUserByEmail', { Email });
// 		//console.log('--------This is the existing email we found', existingEmail.recordset);
// 		if (existingEmail.recordset.length > 0) {
// 			console.log('--------Email is already in use', existingEmail.recordset);
// 			return res.status(400).json({ message: 'Email is already in use' });
// 		}

// 		// Hash password
// 		const hashedPassword = await bcrypt.hash(Password, 10);
// 		const userId = uid();
// 		// Execute stored procedure and retrieve the new UserID
// 		await db.executeProcedure('CreateUser', {
// 			UserId: userId,
// 			Email,
// 			Username,
// 			PasswordHash: hashedPassword,
// 		});

// 		await sendWelcomeEmail(Email);
// 		res.status(201).json({
// 			message: `User ${Email} has been created successfully`,
// 		});
// 	} catch (error) {
// 		console.error('Error happened ', error);
// 		res.status(500).json({ message: `${error.message}` });
// 	}
// });

// Login route

// OG LOGIN ROUTE WITHOUT BLOCKING UNVERIFIED USERS
// userRouter.post('/login', validateSchema(loginUserSchema), async (req, res) => {
// 	try {
// 		const { Email, Password } = req.body;

// 		// Fetch user from DB
// 		const result = await db.executeProcedure('GetUserByEmail', { Email });

// 		if (result.recordset.length === 0) {
// 			return res.status(400).json({ message: 'Invalid email or password' });
// 		}

// 		const user = result.recordset[0];

// 		// Check password
// 		const isValid = await bcrypt.compare(Password, user.PasswordHash);
// 		if (!isValid) {
// 			return res.status(400).json({ message: 'Invalid email or password' });
// 		}

// 		// Create JWT payload
// 		const payload = {
// 			id: user.UserId,
// 			email: user.Email,
// 			username: user.Username,
// 			role: user.Role,
// 		};

// 		// Sign JWT
// 		const token = jwt.sign(payload, process.env.JWT_SECRET, {
// 			expiresIn: '2h',
// 		});

// 		res.status(200).json({
// 			message: 'Login successful',
// 			token,
// 			user: payload,
// 		});
// 	} catch (error) {
// 		console.error('Login failed:', error);
// 		res.status(500).json({ message: 'Login failed', error: error.message });
// 	}
// });

// userRouter.post('/forgot-password', validateSchema(forgortPasswordSchema), async (req, res) => {});

userRouter.post('/register-seller', authenticateToken, validateSchema(registerSellerSchema), async (req, res) => {
	try {
		const UserId = req.user.id;
		const UserEmail = req.user.email;

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
			message: ` Your store: ${BusinessName} is now a registered seller`,
		});

		await sellerRegistrationEmail(UserEmail);
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
