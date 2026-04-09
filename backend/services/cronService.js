import cron from 'node-cron';
import Stripe from 'stripe';
import DbHelper from '../db/dbHelper.js';
import {
	sendSubscriptionRenewalReminder,
	sendSubscriptionExpiredEmail,
	sendOrderAutoCancelledEmail,
	sendRefundProcessedEmail,
} from './emailService.js';

const db = new DbHelper();
const stripe = new Stripe(process.env.SK_TEST);

/**
 * Initialises all cron jobs for the application.
 * Call this once from server.js on startup.
 */
export function initCronJobs() {
	// ──────────────────────────────────────────────────────────────
	// DAILY at 08:00 — Subscription health check
	// 1. Expire stale subscriptions and restore free plan for sellers
	// 2. Send 14-day renewal reminder emails
	// 3. Send  7-day renewal reminder emails
	// 4. Send  1-day renewal reminder emails
	// ──────────────────────────────────────────────────────────────
	cron.schedule('0 8 * * *', async () => {
		console.log('[CRON] Running daily subscription health check...');

		try {
			// ── Step 1: Expire stale subscriptions ──
			await db.executeProcedure('ExpireStaleSubscriptions', {});
			console.log('[CRON] Stale subscriptions expired.');

			// ── Step 2-4: Reminder emails ──
			const thresholds = [
				{ days: 14, flag: 'ReminderSent14' },
				{ days: 7,  flag: 'ReminderSent7' },
				{ days: 1,  flag: 'ReminderSent1' },
			];

			for (const { days, flag } of thresholds) {
				const result = await db.executeProcedure('GetSubscriptionsForReminder', { DaysAhead: days });
				const subscriptions = result.recordset || [];

				for (const sub of subscriptions) {
					try {
						await sendSubscriptionRenewalReminder(
							sub.Email,
							sub.BusinessName,
							sub,
							days
						);

						// Mark reminder as sent
						const updateParams = {
							SubscriptionId: sub.SubscriptionId,
							[flag]: 1,
						};
						await db.executeProcedure('UpdateSellerSubscription', updateParams);

						console.log(`[CRON] Sent ${days}-day reminder to ${sub.Email}`);
					} catch (emailErr) {
						console.error(`[CRON] Failed to send ${days}-day reminder to ${sub.Email}:`, emailErr.message);
					}
				}
			}

			console.log('[CRON] Daily subscription check complete.');
		} catch (err) {
			console.error('[CRON] Error in daily subscription job:', err);
		}
	});

	console.log('[CRON] Subscription cron jobs initialised (daily at 08:00).');

	// ──────────────────────────────────────────────────────────────
	// HOURLY — 24-hour order auto-cancellation
	// Finds Processing orders older than 24 hours, cancels them,
	// restores stock, and emails the buyer.
	// ──────────────────────────────────────────────────────────────
	cron.schedule('0 * * * *', async () => {
		console.log('[CRON] Running 24-hour order auto-cancel check...');
		try {
			const result = await db.executeProcedure('AutoCancelExpiredOrders', {});
			const cancelledOrders = result.recordset || [];

			if (cancelledOrders.length === 0) {
				console.log('[CRON] No expired orders to cancel.');
				return;
			}

			console.log(`[CRON] Auto-cancelled ${cancelledOrders.length} expired order(s).`);

			for (const order of cancelledOrders) {
				try {
					const orderItems = JSON.parse(order.OrderItems || '[]');
					await sendOrderAutoCancelledEmail(
						order.BuyerEmail,
						order.BuyerName,
						order.OrderId,
						orderItems,
						order.TotalAmount
					);
					console.log(`[CRON] Auto-cancel email sent to ${order.BuyerEmail} for order ${order.OrderId}`);
				} catch (emailErr) {
					console.error(`[CRON] Failed to send auto-cancel email for order ${order.OrderId}:`, emailErr.message);
				}
			}
		} catch (err) {
			console.error('[CRON] Error in 24-hour auto-cancel job:', err);
		}
	});

	console.log('[CRON] Order auto-cancel cron initialised (hourly).');

	// ──────────────────────────────────────────────────────────────
	// DAILY at 09:00 — Return request auto-approval
	// Finds pending return requests older than 3 days (seller did not respond),
	// issues Stripe refund automatically, restores stock, and emails the buyer.
	// ──────────────────────────────────────────────────────────────
	cron.schedule('0 9 * * *', async () => {
		console.log('[CRON] Running return auto-approval check...');
		try {
			const result = await db.executeProcedure('GetOverdueReturnRequests', {});
			const overdueReturns = result.recordset || [];

			if (overdueReturns.length === 0) {
				console.log('[CRON] No overdue return requests.');
				return;
			}

			console.log(`[CRON] Auto-approving ${overdueReturns.length} overdue return(s).`);

			for (const ret of overdueReturns) {
				try {
					// Auto-approve in DB + close order (sets Refunded + Sold)
					await db.executeProcedure('AutoApproveReturnRequest', {
						ReturnRequestId: ret.ReturnRequestId,
						OrderId: ret.OrderId,
					});

					// Restore stock
					await db.executeProcedure('RestoreOrderItemStock', { OrderId: ret.OrderId });

					// Issue Stripe refund
					if (ret.PaymentIntentId) {
						try {
							await stripe.refunds.create({ payment_intent: ret.PaymentIntentId });
						} catch (stripeErr) {
							console.error(`[CRON] Stripe refund failed for order ${ret.OrderId}:`, stripeErr.message);
						}
					}

					// Email buyer
					await sendRefundProcessedEmail(ret.BuyerEmail, ret.BuyerName, ret.OrderId, ret.TotalAmount);
					console.log(`[CRON] Auto-approved return for order ${ret.OrderId}, refunded ${ret.BuyerEmail}`);
				} catch (retErr) {
					console.error(`[CRON] Failed to auto-approve return ${ret.ReturnRequestId}:`, retErr.message);
				}
			}
		} catch (err) {
			console.error('[CRON] Error in return auto-approval job:', err);
		}
	});

	console.log('[CRON] Return auto-approval cron initialised (daily at 09:00).');
}
