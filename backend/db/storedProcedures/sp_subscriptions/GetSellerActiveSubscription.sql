USE Marketplace;
GO

-- Returns the seller's best active subscription (lowest commission rate that is currently valid).
-- For free plan sellers (no paid subscription), returns the free plan row.
CREATE OR ALTER PROCEDURE GetSellerActiveSubscription
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- First try to find an active paid subscription (status active, cancelling, or pending_trial)
    SELECT TOP 1
        ss.SubscriptionId,
        ss.SellerId,
        ss.PlanId,
        sp.PlanName,
        sp.PlanCode,
        sp.Price,
        sp.CommissionRate,
        sp.BillingCycle,
        sp.Description,
        ss.Status,
        ss.StartDate,
        ss.CurrentPeriodStart,
        ss.CurrentPeriodEnd,
        ss.StripeSubscriptionId,
        ss.StripeCustomerId,
        ss.CancelAtPeriodEnd,
        ss.CreatedAt,
        ss.UpdatedAt
    FROM SellerSubscriptions ss
    JOIN SubscriptionPlans sp ON ss.PlanId = sp.PlanId
    WHERE ss.SellerId = @SellerId
      AND ss.Status IN ('active', 'cancelling', 'pending_trial')
      AND (ss.CurrentPeriodEnd IS NULL OR ss.CurrentPeriodEnd > GETDATE())
    ORDER BY sp.CommissionRate ASC, ss.CreatedAt DESC;
END;
GO
