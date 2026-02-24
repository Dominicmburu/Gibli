USE Marketplace;
GO

-- Called when a seller registers. Inserts a free plan subscription if they don't already have one.
CREATE OR ALTER PROCEDURE UpsertSellerFreeSubscription
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FreePlanId INT;
    SELECT @FreePlanId = PlanId FROM SubscriptionPlans WHERE PlanCode = 'free';

    IF NOT EXISTS (
        SELECT 1 FROM SellerSubscriptions
        WHERE SellerId = @SellerId AND Status = 'active'
    )
    BEGIN
        INSERT INTO SellerSubscriptions (
            SellerId, PlanId, Status,
            StartDate, CurrentPeriodStart, CurrentPeriodEnd,
            StripeSubscriptionId, StripeCustomerId,
            CreatedAt, UpdatedAt
        )
        VALUES (
            @SellerId, @FreePlanId, 'active',
            GETDATE(), GETDATE(), NULL,
            NULL, NULL,
            GETDATE(), GETDATE()
        );
    END
END;
GO
