import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import DbHelper from '../db/dbHelper.js';
import { sendSubscriptionConfirmationEmail } from '../services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const db = new DbHelper();
const stripe = new Stripe(process.env.SK_TEST);
const subscriptionRouter = express.Router();

// ─────────────────────────────────────────────────────────────
// Plan metadata (kept in sync with SubscriptionPlans seed data)
// ─────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
	standard_yearly: {
		name: 'Standard Annual',
		amount: 10000,       // €100.00 in cents
		currency: 'eur',
		interval: 'year',
		intervalCount: 1,
	},
	monthly: {
		name: 'Monthly Pro',
		amount: 1000,        // €10.00 in cents
		currency: 'eur',
		interval: 'month',
		intervalCount: 1,
	},
	premium_yearly: {
		name: 'Premium Annual',
		amount: 600000,      // €6,000.00 in cents
		currency: 'eur',
		interval: 'year',
		intervalCount: 1,
	},
};

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/plans — public
// ─────────────────────────────────────────────────────────────
subscriptionRouter.get('/plans', async (req, res) => {
	try {
		const result = await db.executeProcedure('GetSubscriptionPlans', {});
		res.json(result.recordset);
	} catch (err) {
		console.error('Error fetching plans:', err);
		res.status(500).json({ message: 'Failed to fetch subscription plans.' });
	}
});

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/pending-seller-setup — auth
// Returns { pendingSetup: true, subscription } when a user has
// paid for a plan but has not yet created their seller account.
// Used by the NavBar to show a persistent "complete setup" banner.
// ─────────────────────────────────────────────────────────────
subscriptionRouter.get('/pending-seller-setup', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.id;

		// 1. Does the user have a paid (non-free) active subscription?
		const subResult = await db.executeProcedure('GetSellerActiveSubscription', { SellerId: userId });
		const sub = subResult.recordset?.[0] || null;

		if (!sub || sub.PlanCode === 'free') {
			return res.json({ pendingSetup: false });
		}

		// 2. Are they already a registered seller?
		const sellerResult = await db.executeProcedure('GetSellerDetails', { SellerId: userId });
		const isSeller = (sellerResult.recordset?.length ?? 0) > 0;

		res.json({ pendingSetup: !isSeller, subscription: isSeller ? null : sub });
	} catch (err) {
		console.error('Error checking pending seller setup:', err);
		res.json({ pendingSetup: false }); // fail silently — banner is non-critical
	}
});

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/my-subscription — auth
// ─────────────────────────────────────────────────────────────
subscriptionRouter.get('/my-subscription', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const result = await db.executeProcedure('GetSellerActiveSubscription', { SellerId: sellerId });
		const sub = result.recordset?.[0] || null;
		res.json(sub);
	} catch (err) {
		console.error('Error fetching seller subscription:', err);
		res.status(500).json({ message: 'Failed to fetch subscription.' });
	}
});

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/history — auth
// ─────────────────────────────────────────────────────────────
subscriptionRouter.get('/history', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const [histResult, payResult] = await Promise.all([
			db.executeProcedure('GetSellerSubscriptionHistory', { SellerId: sellerId }),
			db.executeProcedure('GetSellerSubscriptionPayments', { SellerId: sellerId, Limit: 10 }),
		]);
		res.json({
			subscriptions: histResult.recordset,
			payments: payResult.recordset,
		});
	} catch (err) {
		console.error('Error fetching history:', err);
		res.status(500).json({ message: 'Failed to fetch subscription history.' });
	}
});

// ─────────────────────────────────────────────────────────────
// GET /subscriptions/commission-stats — auth
// ─────────────────────────────────────────────────────────────
subscriptionRouter.get('/commission-stats', authenticateToken, async (req, res) => {
	try {
		const sellerId = req.user.id;
		const { dateFrom, dateTo } = req.query;
		const result = await db.executeProcedure('GetCommissionStats', {
			SellerId: sellerId,
			DateFrom: dateFrom || null,
			DateTo: dateTo || null,
		});
		res.json(result.recordset?.[0] || {
			TotalOrders: 0, TotalGross: 0, TotalCommission: 0, TotalNet: 0
		});
	} catch (err) {
		console.error('Error fetching commission stats:', err);
		res.status(500).json({ message: 'Failed to fetch commission stats.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /subscriptions/create-checkout — auth
// Creates a Stripe Checkout Session for a subscription plan.
// If the seller already has an active paid plan, the new plan
// starts after the current period ends (trial_end approach).
// ─────────────────────────────────────────────────────────────
subscriptionRouter.post('/create-checkout', authenticateToken, async (req, res) => {
	const sellerId = req.user.id;
	const { planId } = req.body;

	if (!planId) {
		return res.status(400).json({ message: 'planId is required.' });
	}

	try {
		// 1. Get the plan details
		const plansResult = await db.executeProcedure('GetSubscriptionPlans', {});
		const plan = plansResult.recordset.find((p) => p.PlanId === Number(planId));

		if (!plan) {
			return res.status(404).json({ message: 'Plan not found.' });
		}
		if (plan.PlanCode === 'free') {
			return res.status(400).json({ message: 'Cannot checkout for the free plan.' });
		}

		const planConfig = PLAN_CONFIG[plan.PlanCode];
		if (!planConfig) {
			return res.status(400).json({ message: 'Invalid plan configuration.' });
		}

		// 2. Check seller's current subscription
		const currentSubResult = await db.executeProcedure('GetSellerActiveSubscription', { SellerId: sellerId });
		const currentSub = currentSubResult.recordset?.[0];

		// 3. Check if already on this exact plan
		if (currentSub && currentSub.PlanCode === plan.PlanCode && currentSub.Status === 'active') {
			return res.status(409).json({ message: 'You are already subscribed to this plan.' });
		}

		// 4. Get or create a Stripe Customer for this seller.
		// The user may not have a seller account yet (pre-registration flow: pay first, then register).
		// In that case fall back to the basic Users table for email/name.
		const sellerResult = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
		let sellerData = sellerResult.recordset?.[0];
		const hasSelllerProfile = !!sellerData;

		if (!sellerData) {
			const userResult = await db.executeProcedure('GetUserById', { UserId: sellerId });
			const userData = userResult.recordset?.[0];
			if (!userData) {
				return res.status(404).json({ message: 'User not found.' });
			}
			sellerData = { Email: userData.Email, BusinessName: userData.Username, StripeCustomerId: null };
		}

		let stripeCustomerId = sellerData.StripeCustomerId;
		if (!stripeCustomerId) {
			const customer = await stripe.customers.create({
				email: sellerData.Email,
				name: sellerData.BusinessName,
				metadata: { sellerId },
			});
			stripeCustomerId = customer.id;
			// Only persist to Sellers table once the seller account exists
			if (hasSelllerProfile) {
				await db.executeProcedure('UpdateSellerStripeCustomerId', {
					SellerId: sellerId,
					StripeCustomerId: stripeCustomerId,
				});
			}
		}

		// 5. Build the Stripe Checkout session
		const lineItem = {
			price_data: {
				currency: planConfig.currency,
				product_data: {
					name: planConfig.name,
					description: plan.Description,
				},
				recurring: {
					interval: planConfig.interval,
					interval_count: planConfig.intervalCount,
				},
				unit_amount: planConfig.amount,
			},
			quantity: 1,
		};

		const sessionParams = {
			mode: 'subscription',
			customer: stripeCustomerId,
			line_items: [lineItem],
			success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.FRONTEND_URL}/seller-subscription`,
			metadata: {
				sellerId,
				planId: String(plan.PlanId),
				planCode: plan.PlanCode,
				isSwitching: currentSub && currentSub.PlanCode !== 'free' ? 'true' : 'false',
			},
		};

		// 6. If seller already has a paid active subscription, set trial to keep old plan until it expires
		const isCurrentlyOnPaidPlan =
			currentSub &&
			currentSub.PlanCode !== 'free' &&
			currentSub.Status === 'active' &&
			currentSub.StripeSubscriptionId;

		if (isCurrentlyOnPaidPlan) {
			const currentPeriodEnd = new Date(currentSub.CurrentPeriodEnd);
			const trialEnd = Math.floor(currentPeriodEnd.getTime() / 1000);

			sessionParams.subscription_data = {
				trial_end: trialEnd,
				metadata: {
					sellerId,
					planId: String(plan.PlanId),
					planCode: plan.PlanCode,
				},
			};

			// Mark the current Stripe subscription to cancel at period end
			await stripe.subscriptions.update(currentSub.StripeSubscriptionId, {
				cancel_at_period_end: true,
			});

			// Update our DB to reflect cancelling status
			await db.executeProcedure('UpdateSellerSubscription', {
				SubscriptionId: currentSub.SubscriptionId,
				Status: 'cancelling',
				CancelAtPeriodEnd: 1,
			});
		} else {
			sessionParams.subscription_data = {
				metadata: {
					sellerId,
					planId: String(plan.PlanId),
					planCode: plan.PlanCode,
				},
			};
		}

		const session = await stripe.checkout.sessions.create(sessionParams);
		res.json({ url: session.url });
	} catch (err) {
		console.error('Error creating subscription checkout:', err);
		res.status(500).json({ message: 'Failed to create checkout session.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /subscriptions/cancel — auth
// Cancels the seller's subscription at the end of the current period.
// ─────────────────────────────────────────────────────────────
subscriptionRouter.post('/cancel', authenticateToken, async (req, res) => {
	const sellerId = req.user.id;
	try {
		const subResult = await db.executeProcedure('GetSellerActiveSubscription', { SellerId: sellerId });
		const sub = subResult.recordset?.[0];

		if (!sub) {
			return res.status(404).json({ message: 'No active subscription found.' });
		}
		if (sub.PlanCode === 'free') {
			return res.status(400).json({ message: 'Cannot cancel the free plan.' });
		}
		if (sub.CancelAtPeriodEnd) {
			return res.status(409).json({ message: 'Subscription is already set to cancel.' });
		}

		// Tell Stripe to cancel at period end
		if (sub.StripeSubscriptionId) {
			await stripe.subscriptions.update(sub.StripeSubscriptionId, {
				cancel_at_period_end: true,
			});
		}

		// Update our DB
		await db.executeProcedure('UpdateSellerSubscription', {
			SubscriptionId: sub.SubscriptionId,
			Status: 'cancelling',
			CancelAtPeriodEnd: 1,
		});

		res.json({
			message: 'Your subscription will remain active until the end of the current period.',
			endDate: sub.CurrentPeriodEnd,
		});
	} catch (err) {
		console.error('Error cancelling subscription:', err);
		res.status(500).json({ message: 'Failed to cancel subscription.' });
	}
});

// ─────────────────────────────────────────────────────────────
// POST /subscriptions/activate-session — auth
// Called by the success page with the Stripe session_id.
// Retrieves the session from Stripe, creates the subscription
// record in the DB, and records the first payment.
// Idempotent — safe to call multiple times (webhook may also run).
// Returns { subscription, isSeller } so the success page knows
// what to show without relying on the JWT role field.
// ─────────────────────────────────────────────────────────────
subscriptionRouter.post('/activate-session', authenticateToken, async (req, res) => {
	const sellerId = req.user.id;
	const { sessionId } = req.body;

	if (!sessionId) {
		return res.status(400).json({ message: 'sessionId is required.' });
	}

	try {
		// 1. Retrieve the Stripe session (expand subscription inline)
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['subscription'],
		});

		// 2. Validate it's a completed subscription checkout belonging to this user
		if (session.mode !== 'subscription') {
			return res.status(400).json({ message: 'Not a subscription session.' });
		}
		if (session.status !== 'complete') {
			return res.status(400).json({ message: 'Payment not yet completed.' });
		}
		if (session.metadata?.sellerId !== sellerId) {
			return res.status(403).json({ message: 'Session does not belong to this account.' });
		}

		const { planId, planCode } = session.metadata;

		// Explicitly retrieve the subscription by ID — more reliable than relying on
		// the expanded object, which may lack period fields immediately after payment.
		const stripeSubId = typeof session.subscription === 'string'
			? session.subscription
			: session.subscription?.id;
		const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

		// 3. Idempotency check — skip creation if already processed
		const existingCheck = await db.executeProcedure('GetSubscriptionByStripeSubId', {
			StripeSubscriptionId: stripeSub.id,
		});

		if (!existingCheck.recordset?.length) {
			// 4. Get period dates from the invoice line items — always populated,
			//    unlike stripeSub.current_period_start which can be undefined on first activation.
			const invoiceId = typeof session.invoice === 'string'
				? session.invoice
				: session.invoice?.id;
			const invoiceObj = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
			const line = invoiceObj?.lines?.data?.[0];

			const currentPeriodStart = line?.period?.start
				? new Date(line.period.start * 1000)
				: (stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : new Date());
			const currentPeriodEnd = line?.period?.end
				? new Date(line.period.end * 1000)
				: (stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null);

			const status = stripeSub.status === 'trialing' ? 'pending_trial' : 'active';

			const newSubResult = await db.executeProcedure('CreateSellerSubscription', {
				SellerId:             sellerId,
				PlanId:               Number(planId),
				Status:               status,
				StartDate:            new Date(),
				CurrentPeriodStart:   currentPeriodStart,
				CurrentPeriodEnd:     currentPeriodEnd,
				StripeSubscriptionId: stripeSub.id,
				StripeCustomerId:     session.customer,
			});

			const newSubscriptionId = newSubResult.recordset?.[0]?.SubscriptionId;

			// Expire any stale free-plan rows for this seller
			await db.executeProcedure('ExpireStaleSubscriptions', {});

			// Save Stripe customer ID to the Sellers table if seller account exists
			try {
				await db.executeProcedure('UpdateSellerStripeCustomerId', {
					SellerId:         sellerId,
					StripeCustomerId: session.customer,
				});
			} catch (_) {
				// Seller account may not exist yet (pre-registration flow) — that's fine
			}

			// 5. Record the first payment — reuse invoiceObj already fetched for dates above
			if (status === 'active' && invoiceObj) {
				try {
					if (invoiceObj.status === 'paid') {
						await db.executeProcedure('CreateSubscriptionPayment', {
							SubscriptionId:        newSubscriptionId,
							SellerId:              sellerId,
							Amount:                invoiceObj.amount_paid / 100,
							Currency:              (invoiceObj.currency || 'eur').toUpperCase(),
							StripeInvoiceId:       invoiceObj.id,
							StripePaymentIntentId: invoiceObj.payment_intent,
							Status:                'successful',
							BillingPeriodStart:    currentPeriodStart,
							BillingPeriodEnd:      currentPeriodEnd,
							PaidAt:                invoiceObj.status_transitions?.paid_at
								? new Date(invoiceObj.status_transitions.paid_at * 1000)
								: new Date(),
						});
					}
				} catch (invErr) {
					console.error('⚠️ Could not record initial payment:', invErr.message);
				}
			}

			// 6. Send confirmation email
			try {
				let emailTarget = null;
				const sellerRes = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
				const sellerDetail = sellerRes.recordset?.[0];
				if (sellerDetail) {
					emailTarget = { email: sellerDetail.Email, name: sellerDetail.BusinessName };
				} else {
					const userRes = await db.executeProcedure('GetUserById', { UserId: sellerId });
					const userDetail = userRes.recordset?.[0];
					if (userDetail) emailTarget = { email: userDetail.Email, name: userDetail.Username };
				}

				const plansResult = await db.executeProcedure('GetSubscriptionPlans', {});
				const plan = plansResult.recordset.find((p) => p.PlanId === Number(planId));

				if (emailTarget && plan) {
					await sendSubscriptionConfirmationEmail(
						emailTarget.email,
						emailTarget.name,
						plan.PlanName,
						plan.Price,
						plan.BillingCycle,
						new Date(stripeSub.current_period_end * 1000)
					);
				}
			} catch (emailErr) {
				console.error('⚠️ Could not send confirmation email:', emailErr.message);
			}

			console.log(`✅ Subscription activated for seller ${sellerId}, plan ${planCode}`);
		} else {
			console.log(`ℹ️ Subscription ${stripeSub.id} already in DB — skipping duplicate activation.`);
		}

		// 7. Return the current subscription + seller status for the success page
		const subResult = await db.executeProcedure('GetSellerActiveSubscription', { SellerId: sellerId });
		const subscription = subResult.recordset?.[0] || null;

		const sellerCheckResult = await db.executeProcedure('GetSellerDetails', { SellerId: sellerId });
		const isSeller = !!sellerCheckResult.recordset?.[0];

		res.json({ subscription, isSeller });
	} catch (err) {
		console.error('Error activating subscription session:', err);
		res.status(500).json({ message: 'Failed to activate subscription.' });
	}
});

export default subscriptionRouter;
