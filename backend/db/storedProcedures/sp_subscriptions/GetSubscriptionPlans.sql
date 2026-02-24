USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetSubscriptionPlans
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        PlanId,
        PlanName,
        PlanCode,
        Price,
        CommissionRate,
        BillingCycle,
        Description,
        IsActive
    FROM SubscriptionPlans
    WHERE IsActive = 1
    ORDER BY PlanId ASC;
END;
GO
