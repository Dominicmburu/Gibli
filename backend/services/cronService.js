import cron from 'node-cron';
import DbHelper from '../db/dbHelper.js';
import {
	sendSubscriptionRenewalReminder,
	sendSubscriptionExpiredEmail,
} from './emailService.js';

const db = new DbHelper();

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
}
