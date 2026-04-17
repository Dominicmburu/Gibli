import cron from 'node-cron';
import Stripe from 'stripe';
import DbHelper from '../db/dbHelper.js';
import {
	sendSubscriptionRenewalReminder,
	sendSubscriptionExpiredEmail,
	sendOrderAutoCancelledEmail,
	sendRefundProcessedEmail,
	sendAdminAlertEmail,
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
					// 1. Issue Stripe refund FIRST — if this fails, abort everything for this return.
					//    Do NOT mark the DB as Refunded or email the buyer until money is confirmed sent.
					if (ret.PaymentIntentId) {
						await stripe.refunds.create(
							{ payment_intent: ret.PaymentIntentId },
							{ idempotencyKey: `auto-${ret.ReturnRequestId}` }
						);
					}

					// 2. Stripe succeeded (or no payment intent) — now update DB
					await db.executeProcedure('AutoApproveReturnRequest', {
						ReturnRequestId: ret.ReturnRequestId,
						OrderId: ret.OrderId,
					});

					// 3. Restore stock — respect partial return items if the buyer specified them
					const itemsResult = await db.executeProcedure('GetReturnItems', { ReturnRequestId: ret.ReturnRequestId });
					const returnItems = itemsResult.recordset || [];
					if (returnItems.length > 0) {
						for (const ri of returnItems) {
							const productId = ri.ProductId ?? ri.productid;
							const qty = Number(ri.ReturnQuantity ?? ri.returnquantity ?? 1);
							await db.executeProcedure('RestoreSpecificItemStock', { ProductId: productId, Quantity: qty });
						}
					} else {
						await db.executeProcedure('RestoreOrderItemStock', { OrderId: ret.OrderId });
					}

					// 4. Email buyer — only after everything above succeeded
					await sendRefundProcessedEmail(ret.BuyerEmail, ret.BuyerName, ret.OrderId, ret.TotalAmount);
					console.log(`[CRON] Auto-approved return for order ${ret.OrderId}, refunded ${ret.BuyerEmail}`);
				} catch (retErr) {
					// If Stripe threw, the DB was never updated — safe to retry on the next cron run
					console.error(`[CRON] Failed to auto-approve return ${ret.ReturnRequestId}:`, retErr.message);
				}
			}
		} catch (err) {
			console.error('[CRON] Error in return auto-approval job:', err);
		}
	});

	console.log('[CRON] Return auto-approval cron initialised (daily at 09:00).');

	// ──────────────────────────────────────────────────────────────
	// DAILY at 02:00 — Payment reconciliation
	// Compares Stripe successful payments (last 48 hours) against
	// orders in the DB. Any payment with no matching order is logged
	// as a warning so it can be resolved manually.
	// ──────────────────────────────────────────────────────────────
	cron.schedule('0 2 * * *', async () => {
		console.log('[CRON] Running payment reconciliation check...');
		try {
			// Fetch all successful Stripe checkout sessions from the last 48 hours
			const since = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
			const sessions = await stripe.checkout.sessions.list({
				limit: 100,
				created: { gte: since },
			});

			const mismatches = [];

			for (const session of sessions.data) {
				// Only check paid one-time payments (not subscriptions)
				if (session.mode !== 'payment') continue;
				if (session.payment_status !== 'paid') continue;

				const draftId = session.metadata?.checkoutDraftId;
				if (!draftId) continue;

				// GetCheckoutDraft only returns rows where IsUsed = 0
				// So if a row IS found → draft not marked used → order was never created
				const result = await db.executeProcedure('GetCheckoutDraft', { DraftId: draftId });
				const draft = result?.recordset?.[0];

				if (draft) {
					const line = `Session: ${session.id} | DraftId: ${draftId} | Amount: €${(session.amount_total / 100).toFixed(2)} | Customer: ${session.customer_details?.email || 'unknown'}`;
					mismatches.push(line);
					console.error(`[RECONCILIATION] ⚠️ Paid but no order: ${line}`);
				}
			}

			if (mismatches.length === 0) {
				console.log('[CRON] Reconciliation complete — all payments matched.');
				await sendAdminAlertEmail(
					'Daily reconciliation passed — all payments matched',
					[`Checked ${sessions.data.length} Stripe sessions. No issues found.`]
				);
			} else {
				console.error(`[CRON] Reconciliation found ${mismatches.length} unmatched payment(s).`);
				await sendAdminAlertEmail(
					`${mismatches.length} payment(s) have no matching order — manual review required`,
					mismatches
				);
			}
		} catch (err) {
			console.error('[CRON] Error in reconciliation job:', err);
			await sendAdminAlertEmail(
				'Reconciliation cron FAILED — could not run check',
				[err.message || 'Unknown error']
			);
		}
	});

	console.log('[CRON] Payment reconciliation cron initialised (daily at 02:00).');

	// ──────────────────────────────────────────────────────────────
	// DAILY at 03:00 — Chat auto-deletion (29-day rule)
	// Physically removes conversations and their messages where the
	// last message (or creation date) is older than 29 days.
	// ──────────────────────────────────────────────────────────────
	cron.schedule('0 3 * * *', async () => {
		console.log('[CRON] Running chat auto-delete (29-day rule)...');
		try {
			const result = await db.executeProcedure('AutoDeleteOldConversations', {});
			const count = result.recordset?.[0]?.DeletedCount ?? 0;
			console.log(`[CRON] Chat auto-delete complete: ${count} conversation(s) removed.`);
		} catch (err) {
			console.error('[CRON] Chat auto-delete failed:', err.message);
		}
	});

	console.log('[CRON] Chat auto-delete cron initialised (daily at 03:00).');
}
