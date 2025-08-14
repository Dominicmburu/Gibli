// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRouter from './routes/userRoutes.js';
import categoryRouter from './routes/categoryRoutes.js';
import sellerRouter from './routes/sellerRoutes.js';
import productRouter from './routes/productRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import checkoutRouter from './routes/checkoutRoute.js';
// 1. Load environment variables
dotenv.config();

// 2. Initialize app
const app = express();

app.use(cors());
app.use(express.json()); // for parsing JSON requests
app.use((req, res, next) => {
	console.log(`[${req.method}] ${req.url}`);
	console.log('Incoming body:', req.body);
	next();
});

app.use('/users', userRouter);
app.use('/categories', categoryRouter);
app.use('/uploads', sellerRouter);
app.use('/products', productRouter);
app.use('/cart', cartRouter);
app.use('/checkout', checkoutRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
