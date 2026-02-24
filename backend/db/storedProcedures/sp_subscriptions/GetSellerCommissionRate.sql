USE Marketplace;
GO

-- Returns the effective commission rate and active subscription ID for a seller.
-- If no active paid subscription exists, returns the free plan default (0.05).
CREATE OR ALTER PROCEDURE GetSellerCommissionRate
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        COALESCE(MIN(sp.CommissionRate), 0.0500) AS CommissionRate,
        ss.SubscriptionId
    FROM SellerSubscriptions ss
    JOIN SubscriptionPlans sp ON ss.PlanId = sp.PlanId
    WHERE ss.SellerId = @SellerId
      AND ss.Status IN ('active', 'cancelling', 'pending_trial', 'payment_failed')
      AND (ss.CurrentPeriodEnd IS NULL OR ss.CurrentPeriodEnd > GETDATE())
    GROUP BY ss.SubscriptionId
    ORDER BY MIN(sp.CommissionRate) ASC;

    -- If no rows returned, the caller defaults to 0.05
END;
GO
