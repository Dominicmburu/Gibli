USE Marketplace;
GO

-- Returns the full subscription history for a seller, newest first.
CREATE OR ALTER PROCEDURE GetSellerSubscriptionHistory
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ss.SubscriptionId,
        ss.PlanId,
        sp.PlanName,
        sp.PlanCode,
        sp.Price,
        sp.CommissionRate,
        sp.BillingCycle,
        ss.Status,
        ss.StartDate,
        ss.CurrentPeriodStart,
        ss.CurrentPeriodEnd,
        ss.CancelAtPeriodEnd,
        ss.CreatedAt,
        ss.UpdatedAt
    FROM SellerSubscriptions ss
    JOIN SubscriptionPlans sp ON ss.PlanId = sp.PlanId
    WHERE ss.SellerId = @SellerId
    ORDER BY ss.CreatedAt DESC;
END;
GO
