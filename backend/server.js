// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from './routes/userRoutes.js';
import categoryRouter from './routes/categoryRoutes.js';
import sellerRouter from './routes/sellerRoutes.js';
import productRouter from './routes/productRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import checkoutRouter, { stripeWebhook } from './routes/checkoutRoute.js';
import wishlistRouter from './routes/wishListRoutes.js';
import storeRouter from './routes/storeRoutes.js';
import shippingRouter from './routes/shippingRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import returnRouter from './routes/returnRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import subscriptionRouter from './routes/subscriptionRoutes.js';
import { initCronJobs } from './services/cronService.js';
import { ensureOrderReturnSchema } from './services/orderReturnSupport.js';

// 1. Load environment variables
dotenv.config();

// 2. Initialize app
const app = express();

app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:5173',
	credentials: true,
}));
app.use(cookieParser());

app.post('/checkout/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

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
app.use('/wishlist', wishlistRouter);
app.use('/store', storeRouter);
app.use('/shipping', shippingRouter);
app.use('/orders', orderRouter);
app.use('/subscriptions', subscriptionRouter);
app.use('/reviews', reviewRouter);
app.use('/returns', returnRouter);
app.use('/messages', messageRouter);

// Initialise return schema (tables, columns, constraints) once at startup
ensureOrderReturnSchema().catch((err) =>
	console.error('[STARTUP] Failed to initialise order return schema:', err)
);

// Initialise daily cron jobs (subscription reminders + expiry + return auto-approval)
initCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
