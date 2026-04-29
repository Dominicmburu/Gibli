# Gibli Marketplace — QA Testing Guide

## 1. Test Environment

| Item | Value |
|------|-------|
| Frontend URL | `http://localhost:5173` |
| Backend URL | `http://localhost:3000` |
| Stripe mode | Test (sandbox) |
| PayPal mode | Sandbox |
| Database | Local — `Marketplace` |

---

## 2. Login Credentials

### App Accounts

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyertester@antprotocol.eu` | `Password@12` |
| Seller | `sellertester@antprotocol.eu` | `Password@12` |

### PayPal Sandbox Accounts

| Role | Email | Password | Login URL |
|------|-------|----------|-----------|
| Buyer | `sb-umcmg50856860@personal.example.com` | `J9xvo.n9` | https://www.sandbox.paypal.com |
| Seller/Business | `sb-jphpf50807165@business.example.com` | `a%AcI#x4` | https://www.sandbox.paypal.com |

---

## 3. Payment Test Credentials

### Stripe — Credit/Debit Card

| Field | Value |
|-------|-------|
| Email | `buyertester@antprotocol.eu` |
| Card number | `4242 4242 4242 4242` |
| Expiry | `09/30` |
| CVC | `111` |
| Cardholder name | `buyer` |
| Country | Germany |

**Test scenarios:**

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| ✅ Payment succeeds | `4242 4242 4242 4242` | `09/30` | `111` |
| ✅ 3D Secure required | `4000 0025 0000 3155` | `09/30` | `111` |
| ❌ Card declined | `4000 0000 0000 9995` | `09/30` | `111` |
| ❌ Insufficient funds | `4000 0000 0000 9987` | `09/30` | `111` |

---

### Stripe — SEPA Direct Debit

| Field | Value |
|-------|-------|
| Email | `buyertester@antprotocol.eu` |
| IBAN | `DE89370400440532013000` |
| Name on account | `buyer` |
| Billing address | Any address (city, postal code, country) |

**Test scenarios:**

| Scenario | IBAN |
|----------|------|
| ✅ Payment succeeds | `DE89370400440532013000` |
| ✅ Payment succeeds (alternate) | `AT61 1904 3002 3457 3201` |
| ❌ Payment fails after mandate | `AT83 1904 3002 3457 3208` |

> **Note:** SEPA orders appear as **AwaitingPayment** immediately after checkout.
> To simulate funds clearing, go to Stripe Dashboard → find the PaymentIntent → trigger `payment_intent.succeeded` manually.

---

### PayPal

| Field | Value |
|-------|-------|
| Buyer email | `sb-umcmg50856860@personal.example.com` |
| Buyer password | `J9xvo.n9` |

**Test scenarios:**

| Scenario | How to trigger |
|----------|---------------|
| ✅ Payment succeeds | Log in with sandbox buyer account → click **Pay Now** |
| ❌ Cancel payment | On PayPal approval page, click **Cancel** |

---

## 4. Buyer Test Scenarios

### Authentication
- [ ] Log in with `buyertester@antprotocol.eu` / `Password@12`
- [ ] Log in with wrong password → error message shown
- [ ] Log out → redirected, session cleared
- [ ] Clicking **Buy Now** while logged out → redirected to login page

### Browsing & Cart
- [ ] Browse products by category
- [ ] Search for a product
- [ ] View product detail page
- [ ] Add product to cart
- [ ] Update quantity in cart
- [ ] Remove item from cart
- [ ] Add product to wishlist

### Checkout — Card Payment (Buy Now)
- [ ] Click **Buy Now** on a product
- [ ] Select shipping address and method
- [ ] Click **Choose Payment Method**
- [ ] Select **Credit / Debit Card** — processing fee displayed correctly
- [ ] Click **Pay with Card** → redirected to Stripe hosted page
- [ ] Enter card `4242 4242 4242 4242`, expiry `09/30`, CVC `111`
- [ ] Redirected to `/payment/success` — shows **"Payment Successful!"**
- [ ] Order confirmation email received at `buyertester@antprotocol.eu`
- [ ] Cart cleared after purchase
- [ ] Order visible in **My Orders**

### Checkout — Card Payment (Cart)
- [ ] Add multiple items to cart → go to Finalize Checkout
- [ ] Review order summary, select shipping per item
- [ ] Click **Pay & Place Order** → payment selector opens
- [ ] Select Card → complete payment
- [ ] All orders created (one per seller)

### Checkout — SEPA Direct Debit
- [ ] Select **SEPA Direct Debit** — notice about 1–3 day clearing shown
- [ ] Click **Pay with SEPA** → redirected to Stripe hosted page
- [ ] Enter IBAN `DE89370400440532013000`, name `buyer`, any billing address
- [ ] Redirected to `/payment/success` — shows **"Bank Transfer Authorised"** (NOT "Payment Successful")
- [ ] SEPA confirmation email received (bank transfer received, awaiting clearing)
- [ ] Order shows as **AwaitingPayment** in My Orders
- [ ] Simulate clearing in Stripe Dashboard → order moves to **Processing**
- [ ] Payment confirmed email received after clearing

### Checkout — PayPal
- [ ] Select **PayPal** — processing fee shown
- [ ] Click **Pay with PayPal** → redirected to `sandbox.paypal.com`
- [ ] Log in as `sb-umcmg50856860@personal.example.com` / `J9xvo.n9`
- [ ] Approve payment → redirected back to `/payment/success`
- [ ] Shows **"Payment Successful!"**
- [ ] Order confirmation email received
- [ ] Order visible in My Orders

### Checkout — Cancel / Failure
- [ ] Start Stripe checkout → click Cancel → `/payment/fail` page shown
- [ ] `/payment/fail` shows **"Payment Cancelled"** with **Try Again** and **Back to Cart** buttons
- [ ] Cancel on PayPal approval page → `/payment/fail` shown
- [ ] Use declined card `4000 0000 0000 9995` → Stripe inline error (no redirect to fail page)

### Post-Checkout
- [ ] Navigate to another product after abandoning checkout → **Buy Now** button works correctly (no false login redirect)
- [ ] View order details (items, total, status, tracking)
- [ ] Retry SEPA payment after failure (uses `?retry=` link in email)

---

## 5. Seller Test Scenarios

### Authentication & Dashboard
- [ ] Log in as `sellertester@antprotocol.eu` / `Password@12`
- [ ] View Seller Dashboard
- [ ] New orders badge visible on sidebar when orders are in **Processing**

### Product Management
- [ ] Create a new product listing (name, price, stock, images, shipping)
- [ ] Edit an existing product
- [ ] Set stock quantity — low stock badge appears when stock ≤ threshold
- [ ] Delete a product

### Order Management
- [ ] New order notification email received when buyer places order
- [ ] View incoming orders in Seller Orders page
- [ ] **Confirm** order → status → `Confirmed`, buyer emailed
- [ ] **Mark as Shipped** (enter tracking number + URL) → status → `Shipped`, buyer emailed
- [ ] **Mark as Delivered** → status → `Delivered`, buyer emailed
- [ ] **Reject** order → status → `Rejected`, stock restored, buyer emailed
- [ ] Confirm: **NO** email sent for `Sold` (internal status after 14-day window)
- [ ] Confirm: **NO** email sent for `Cancelled` (buyer-initiated)

### Subscription
- [ ] View subscription plans
- [ ] Subscribe to a plan → Stripe subscription checkout
- [ ] Subscription active → seller dashboard unlocked

---

## 6. Edge Cases

| Scenario | Expected Result |
|----------|----------------|
| Seller tries to buy their own product | Blocked — "You cannot purchase your own products" |
| Checkout with out-of-stock item | Blocked at draft creation with clear error |
| Buy Now clicked while page is loading auth | Button disabled — no false redirect to login |
| Stripe webhook fires + buyer hits success page simultaneously | Only one order created (atomic draft claim) |
| PayPal buyer closes tab after approval | Webhook `PAYMENT.CAPTURE.COMPLETED` creates order automatically |
| 409 from activate-session (draft consumed, no order) | "Payment received — contact support" card with session reference shown |
| Navigate to `/payment/success` with no params | Page shows success state without crash |
| Navigate to `/payment/fail` directly | Shows styled cancel page correctly |

---

## 7. Email Verification Checklist

| Trigger | Recipient | What to expect |
|---------|-----------|----------------|
| Order placed (card / PayPal) | Buyer | Order confirmation with items + total |
| Order placed (SEPA) | Buyer | "Bank transfer received — awaiting clearing" |
| SEPA funds cleared | Buyer | "Payment confirmed — order is now active" |
| SEPA payment failed | Buyer | Payment failed + retry link |
| Order confirmed by seller | Buyer | Status update |
| Order shipped | Buyer | Status update + tracking number/link |
| Order delivered | Buyer | Status update |
| New order received | Seller | Order notification with items + buyer address |
| Subscription activated | Seller | Subscription confirmation |
| Subscription payment failed | Seller | Payment failed notification |
| Dispute opened (Stripe) | Admin (`dominic@antprotocol.eu`) | Dispute alert with order/payout details |
| Dispute closed (Stripe) | Admin | Outcome alert (won / lost) |
