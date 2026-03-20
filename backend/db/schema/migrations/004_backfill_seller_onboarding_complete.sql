-- Migration 004: Backfill HasCompletedOnboarding for existing paid sellers
-- Run ONCE after migration 003 (which added the HasCompletedOnboarding column).
-- Sets HasCompletedOnboarding = 1 for all sellers who have already completed
-- a paid subscription payment (identified by a Stripe subscription ID).
-- Free-plan-only sellers are left at 0 — they will see the banner prompting
-- them to complete their plan selection through the onboarding flow.

UPDATE Sellers
SET HasCompletedOnboarding = 1
WHERE UserId IN (
    SELECT DISTINCT SellerId
    FROM SellerSubscriptions
    WHERE StripeSubscriptionId IS NOT NULL
      AND Status IN ('active', 'cancelling', 'pending_trial')
);

-- Expected result: rows affected = number of sellers with paid Stripe subscriptions.
-- (Was 7 on the production DB as of 2026-03-10)
