-- ============================================================
-- UPDATE SUBSCRIPTION PLANS — test pricing
-- Replaces Standard Annual, Monthly Pro, Premium Annual with:
--   Package 1  (€1/month,  3% commission)
--   Package 2  (€2/month,  0% commission)
-- Free Plan (id 1) is left unchanged.
-- ============================================================

-- Update Package 1 (was Standard Annual, PlanId = 2)
UPDATE [dbo].[SubscriptionPlans]
SET
    PlanName       = 'Package 1',
    PlanCode       = 'package_1',
    Price          = 1.00,
    CommissionRate = 0.0300,
    BillingCycle   = 'monthly',
    Description    = 'Pay €1 per month and reduce your commission to 3%. Ideal for testing the subscription experience.',
    IsActive       = 1
WHERE PlanId = 2;

-- Update Package 2 (was Monthly Pro, PlanId = 3)
UPDATE [dbo].[SubscriptionPlans]
SET
    PlanName       = 'Package 2',
    PlanCode       = 'package_2',
    Price          = 2.00,
    CommissionRate = 0.0000,
    BillingCycle   = 'monthly',
    Description    = 'Pay €2 per month and sell with zero commission. Keep 100% of every sale.',
    IsActive       = 1
WHERE PlanId = 3;

-- Deactivate Premium Annual (PlanId = 4)
UPDATE [dbo].[SubscriptionPlans]
SET IsActive = 0
WHERE PlanId = 4;

-- Verify
SELECT PlanId, PlanName, PlanCode, Price, CommissionRate, BillingCycle, IsActive
FROM [dbo].[SubscriptionPlans]
ORDER BY PlanId;
