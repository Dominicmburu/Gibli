// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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
import subscriptionRouter from './routes/subscriptionRoutes.js';
import { initCronJobs } from './services/cronService.js';
// 1. Load environment variables
dotenv.config();

// 2. Initialize app
const app = express();

app.use(cors());

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

// Initialise daily cron jobs (subscription reminders + expiry)
initCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
