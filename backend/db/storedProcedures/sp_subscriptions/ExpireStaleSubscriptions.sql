USE Marketplace;
GO

-- Called by cron job daily.
-- 1. Marks paid subscriptions whose period has ended as 'expired'.
-- 2. Ensures sellers have a free plan subscription if they have no other active one.
CREATE OR ALTER PROCEDURE ExpireStaleSubscriptions
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FreePlanId INT;
    SELECT @FreePlanId = PlanId FROM SubscriptionPlans WHERE PlanCode = 'free';

    -- Step 1: Expire subscriptions whose period has ended
    UPDATE SellerSubscriptions
    SET
        Status    = 'expired',
        UpdatedAt = GETDATE()
    WHERE Status IN ('active', 'cancelling', 'pending_trial', 'payment_failed')
      AND CurrentPeriodEnd IS NOT NULL
      AND CurrentPeriodEnd < GETDATE();

    -- Step 2: For sellers who now have no active subscription, insert a free plan row
    INSERT INTO SellerSubscriptions (
        SellerId, PlanId, Status,
        StartDate, CurrentPeriodStart, CurrentPeriodEnd,
        CreatedAt, UpdatedAt
    )
    SELECT DISTINCT
        s.UserId,
        @FreePlanId,
        'active',
        GETDATE(), GETDATE(), NULL,
        GETDATE(), GETDATE()
    FROM Sellers s
    WHERE NOT EXISTS (
        SELECT 1 FROM SellerSubscriptions ss2
        WHERE ss2.SellerId = s.UserId
          AND ss2.Status IN ('active', 'cancelling', 'pending_trial')
          AND (ss2.CurrentPeriodEnd IS NULL OR ss2.CurrentPeriodEnd > GETDATE())
    );
END;
GO
