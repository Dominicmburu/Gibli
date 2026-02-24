USE Marketplace;
GO

-- Returns payment history for a seller's subscriptions.
CREATE OR ALTER PROCEDURE GetSellerSubscriptionPayments
    @SellerId VARCHAR(50),
    @Limit    INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@Limit)
        sp.PaymentId,
        sp.SubscriptionId,
        ss_plan.PlanName,
        ss_plan.PlanCode,
        sp.Amount,
        sp.Currency,
        sp.Status,
        sp.BillingPeriodStart,
        sp.BillingPeriodEnd,
        sp.PaidAt,
        sp.CreatedAt
    FROM SubscriptionPayments sp
    JOIN SellerSubscriptions ss ON sp.SubscriptionId = ss.SubscriptionId
    JOIN SubscriptionPlans ss_plan ON ss.PlanId = ss_plan.PlanId
    WHERE sp.SellerId = @SellerId
    ORDER BY sp.CreatedAt DESC;
END;
GO
