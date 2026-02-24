# Subscription Feature — Flow Guide & Scenarios

This document tells the full story of the subscription system from a user's point of view. Follow each scenario step-by-step to understand the complete flow.

---

## The 4 Plans at a Glance

| Plan | Price | Commission | Who it's for |
|------|-------|------------|--------------|
| Free | €0 | 5% per sale | New sellers testing the platform |
| Standard Annual | €100 / year | 3% per sale | Established sellers who sell > €5,000/year |
| Monthly Pro | €10 / month | 3% per sale | Sellers who want flexibility, no lock-in |
| Premium Annual | €6,000 / year | 0% commission | High-volume sellers doing €120k+/year |

---

## Scenario 1 — Brand New Seller, Choosing the Free Plan

**Starting point:** User has created a buyer account and is logged in.

1. User visits `/become-seller`
2. They see 4 plan cards. They read the features and decide to start for free.
3. They click **"Start for Free"** on the Free Plan card.
4. They land on `/seller/register` and fill in their VAT number, business name, and country.
5. They submit the form. The backend calls `RegisterSeller` then `UpsertSellerFreeSubscription` — a free plan subscription row is created in the database.
6. Their token is cleared and they are redirected to `/login`.
7. They log in again. Their JWT now has `role: 'seller'`.
8. They land on `/seller-dashboard`. The subscription card shows **"Free Plan — 5% commission"**.

**What happens on a sale:** Every time a buyer purchases from this seller, the webhook records a `CommissionLedger` row with `CommissionRate = 0.05`.

---

## Scenario 2 — Brand New Seller, Choosing a Paid Plan

**Starting point:** User has created a buyer account and is logged in.

1. User visits `/become-seller`
2. They see the plan cards. They want to pay monthly and keep 3% commission.
3. They click **"Choose Monthly Pro"** on the Monthly Pro card.
4. They are taken to `/subscription/3` — the plan detail page. They see the full feature list, a worked example calculator (€200 sale → €6 commission → €194 net), and a **"Subscribe — €10 / month"** button.
5. They click **"Subscribe — €10 / month"**. The frontend calls `POST /subscriptions/create-checkout` with `planId: 3`.
6. The backend checks if they have a seller profile. They don't — so it falls back to their basic user record for email and name.
7. A Stripe customer is created. A Stripe Checkout session is created with `mode: 'subscription'`.
8. The user is redirected to Stripe's hosted checkout page. They enter card `4242 4242 4242 4242`.
9. Payment succeeds. Stripe fires a `checkout.session.completed` webhook.
10. The webhook handler creates a `SellerSubscriptions` row: `Status = 'active'`, `CommissionRate = 0.03`, Stripe IDs stored.
11. A confirmation email is sent to the user.
12. The user is redirected to `/subscription/success`.
13. The success page detects `role: 'buyer'` in their JWT (they are not a seller yet). It shows a blue **"One more step!"** banner and a **"Create Your Seller Account"** button.
14. The user clicks the button and lands on `/seller/register`.
15. They fill in their business details and submit.
16. The backend calls `RegisterSeller` then `UpsertSellerFreeSubscription`. The upsert checks for an existing active subscription — finds the Monthly Pro one — and **skips** inserting a free plan row. The paid plan stays intact.
17. Their token is cleared. They are redirected to `/login`.
18. They log in again. Their JWT now has `role: 'seller'`.
19. They land on `/seller-dashboard`. The subscription card shows **"Monthly Pro — 3% commission"** with a countdown timer.

---

## Scenario 3 — Existing Seller on Free Plan, Upgrading to Annual

**Starting point:** Seller is logged in with `role: 'seller'`, currently on the Free Plan.

1. Seller visits `/seller-subscription` from the sidebar.
2. They see their current plan: **Free Plan**, no expiry, 5% commission.
3. In the "Other Plans" section, they see Standard Annual, Monthly Pro, and Premium Annual cards.
4. They click **"Subscribe — €100 / year"** on Standard Annual.
5. A confirmation modal appears: *"You are on the Free Plan. Subscribing will activate Standard Annual immediately."* They confirm.
6. The frontend calls `POST /subscriptions/create-checkout` with `planId: 2`.
7. The backend finds the seller's active subscription (Free Plan). Since the Free Plan has no `StripeSubscriptionId`, it is treated as a fresh subscription (no `cancel_at_period_end` needed).
8. A Stripe Checkout session is created normally. The user is redirected to Stripe.
9. Payment succeeds. Webhook fires.
10. The webhook creates the new `SellerSubscriptions` row. `ExpireStaleSubscriptions` is called, which marks the old free plan row as `expired`.
11. The user is redirected to `/subscription/success`. Since `role: 'seller'`, the page shows **"Go to Dashboard"**.
12. Dashboard subscription card now shows **"Standard Annual — 3% commission"** + countdown to renewal.
13. Revenue page now calculates commission at **3%** instead of 5%.

---

## Scenario 4 — Existing Seller Switching from Monthly to Annual

**Starting point:** Seller is logged in, currently on Monthly Pro (active, 18 days left in billing period).

1. Seller visits `/subscription/2` (Standard Annual detail page).
2. The page fetches their current subscription. It detects they have an active paid plan.
3. The subscribe section shows a yellow warning: *"You currently have an active plan. Subscribing will activate Standard Annual after your current plan ends on [date 18 days away]. Your current commission rate remains unchanged until then."*
4. They click **"Schedule Switch to Standard Annual"**.
5. The frontend calls `POST /subscriptions/create-checkout`.
6. The backend:
   - Sets `cancel_at_period_end: true` on their current Stripe subscription.
   - Updates the `SellerSubscriptions` row to `Status = 'cancelling'`.
   - Creates a new Stripe Checkout session with `subscription_data.trial_end` set to the end of the current billing period (18 days from now).
7. The user completes payment on Stripe.
8. The webhook creates the new subscription row with `Status = 'pending_trial'`.
9. For the next 18 days, the seller stays on Monthly Pro at 3% commission.
10. When the trial ends, Stripe charges them €100 for the annual plan. The `invoice.paid` webhook fires and updates the subscription to `Status = 'active'`.

---

## Scenario 5 — Seller Cancels Their Subscription

**Starting point:** Seller is on Monthly Pro, wants to cancel.

1. Seller visits `/seller-subscription`.
2. They see the cancel button at the bottom of the current plan card.
3. They click **"Cancel Subscription"**. A confirmation dialog appears: *"Your subscription will remain active until [date]. After that, you will move to the Free Plan (5% commission)."*
4. They confirm. The frontend calls `POST /subscriptions/cancel`.
5. The backend calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })` and updates the DB row to `Status = 'cancelling'`.
6. The subscription card now shows the status badge **"Cancelling"** and the countdown timer still ticking.
7. On the last day before expiry, the daily cron job sends a **1-day reminder email**: *"Your Monthly Pro plan expires tomorrow."*
8. On expiry day, Stripe fires `customer.subscription.deleted`. The webhook sets `Status = 'expired'`.
9. The cron job also runs `ExpireStaleSubscriptions` which inserts a new free plan row for the seller.
10. The seller is now on Free Plan with 5% commission. Their next sale will use 5%.

---

## Scenario 6 — Payment Fails on Renewal

**Starting point:** Seller is on Standard Annual. Their card is declined on renewal.

1. Stripe retries the charge automatically (Stripe's built-in dunning).
2. Each failed attempt fires `invoice.payment_failed`. The webhook sets `Status = 'payment_failed'` in the DB.
3. A **payment failed email** is sent: *"Your Standard Annual subscription payment failed. Please update your payment method."*
4. The subscription card on `/seller-subscription` shows the status badge **"Payment Failed"** in red.
5. If Stripe eventually collects payment, `invoice.paid` fires and the status resets to `active`.
6. If Stripe exhausts all retries and cancels the subscription, `customer.subscription.deleted` fires and the subscription is marked `expired`.

---

## Scenario 7 — Renewal Reminder Emails

The daily cron job (runs at 08:00 every day) sends reminder emails at three intervals:

| Days Before Renewal | Email Subject |
|---------------------|---------------|
| 14 days | "Your [Plan Name] renews in 2 weeks" |
| 7 days | "Your [Plan Name] renews in 1 week" |
| 1 day | "Your [Plan Name] renews tomorrow" |

Each reminder is sent only once per billing period. The flags `ReminderSent14`, `ReminderSent7`, and `ReminderSent1` are set to `1` after sending. When a subscription renews (new invoice paid), the flags are reset to `0` for the new period.

---

## How Commission Is Recorded

Every time a buyer's order is created (via the checkout webhook):

1. For each seller group in the order, the backend calls `GetSellerCommissionRate` with the seller's ID.
2. The SP returns the active commission rate (defaults to 5% if no subscription found).
3. The backend calls `RecordCommission` to write a `CommissionLedger` row:
   - `GrossAmount` — total sale amount for this seller
   - `CommissionRate` — e.g. 0.03
   - `CommissionAmount` — e.g. €6.00
   - `NetAmount` — e.g. €194.00
4. The commission rate is **locked at the time of sale** — even if the seller changes plans later, historical records are preserved.

---

## Key URLs Reference

| URL | Who sees it | Purpose |
|-----|-------------|---------|
| `/become-seller` | Anyone | Choose a plan, start the seller journey |
| `/subscription/:planId` | Anyone | Full plan detail + subscribe button |
| `/subscription/success` | After Stripe payment | Confirms payment; shows next step |
| `/seller/register` | Logged-in non-sellers | Create the seller account |
| `/seller-subscription` | Logged-in sellers | Manage plan, view history, cancel |
| `/seller-dashboard` | Logged-in sellers | Main dashboard; shows subscription card |

---

## Database Tables (Quick Reference)

| Table | What it stores |
|-------|---------------|
| `SubscriptionPlans` | The 4 static plan definitions |
| `SellerSubscriptions` | One row per subscription lifecycle per seller |
| `SubscriptionPayments` | Immutable record of every payment event |
| `CommissionLedger` | One row per order, recording gross/commission/net |
