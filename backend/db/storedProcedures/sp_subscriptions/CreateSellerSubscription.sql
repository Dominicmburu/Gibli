USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CreateSellerSubscription
    @SellerId               VARCHAR(50),
    @PlanId                 INT,
    @Status                 NVARCHAR(30),
    @StartDate              DATETIME,
    @CurrentPeriodStart     DATETIME NULL,
    @CurrentPeriodEnd       DATETIME NULL,
    @StripeSubscriptionId   NVARCHAR(255) NULL,
    @StripeCustomerId       NVARCHAR(255) NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO SellerSubscriptions (
        SellerId, PlanId, Status,
        StartDate, CurrentPeriodStart, CurrentPeriodEnd,
        StripeSubscriptionId, StripeCustomerId,
        CancelAtPeriodEnd,
        ReminderSent14, ReminderSent7, ReminderSent1,
        CreatedAt, UpdatedAt
    )
    VALUES (
        @SellerId, @PlanId, @Status,
        @StartDate, @CurrentPeriodStart, @CurrentPeriodEnd,
        @StripeSubscriptionId, @StripeCustomerId,
        0,
        0, 0, 0,
        GETDATE(), GETDATE()
    );

    -- Return the new SubscriptionId
    SELECT SCOPE_IDENTITY() AS SubscriptionId;
END;
GO
