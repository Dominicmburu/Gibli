// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		return res.status(401).json({ message: 'Access token missing' });
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ message: 'Invalid or expired token' });
		}

		req.user = user;
		next();
	});
	// jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
	// 	if (err) {
	// 		console.log('JWT Verification failed:', err.message);
	// 		return res.status(403).json({ message: 'Invalid or expired token' });
	// 	}
	// 	console.log('Decoded token:', decoded);
	// 	next();
	// });
}
