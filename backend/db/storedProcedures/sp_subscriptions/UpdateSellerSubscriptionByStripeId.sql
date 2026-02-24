USE Marketplace;
GO

-- Updates a subscription by its Stripe Subscription ID (used in webhook handlers).
CREATE OR ALTER PROCEDURE UpdateSellerSubscriptionByStripeId
    @StripeSubscriptionId   NVARCHAR(255),
    @Status                 NVARCHAR(30)    NULL = NULL,
    @CurrentPeriodStart     DATETIME        NULL = NULL,
    @CurrentPeriodEnd       DATETIME        NULL = NULL,
    @CancelAtPeriodEnd      BIT             NULL = NULL,
    @ReminderSent14         BIT             NULL = NULL,
    @ReminderSent7          BIT             NULL = NULL,
    @ReminderSent1          BIT             NULL = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SellerSubscriptions
    SET
        Status             = COALESCE(@Status, Status),
        CurrentPeriodStart = COALESCE(@CurrentPeriodStart, CurrentPeriodStart),
        CurrentPeriodEnd   = COALESCE(@CurrentPeriodEnd, CurrentPeriodEnd),
        CancelAtPeriodEnd  = COALESCE(@CancelAtPeriodEnd, CancelAtPeriodEnd),
        ReminderSent14     = COALESCE(@ReminderSent14, ReminderSent14),
        ReminderSent7      = COALESCE(@ReminderSent7, ReminderSent7),
        ReminderSent1      = COALESCE(@ReminderSent1, ReminderSent1),
        UpdatedAt          = GETDATE()
    WHERE StripeSubscriptionId = @StripeSubscriptionId;

    -- Return the updated row for convenience
    SELECT
        ss.SubscriptionId,
        ss.SellerId,
        ss.PlanId,
        sp.PlanName,
        sp.CommissionRate,
        ss.Status,
        ss.CurrentPeriodEnd
    FROM SellerSubscriptions ss
    JOIN SubscriptionPlans sp ON ss.PlanId = sp.PlanId
    WHERE ss.StripeSubscriptionId = @StripeSubscriptionId;
END;
GO
