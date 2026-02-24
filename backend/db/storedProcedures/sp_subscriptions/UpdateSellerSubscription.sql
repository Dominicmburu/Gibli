USE Marketplace;
GO

-- Flexible update procedure — only updates fields that are provided (non-NULL).
CREATE OR ALTER PROCEDURE UpdateSellerSubscription
    @SubscriptionId         INT,
    @Status                 NVARCHAR(30)    NULL = NULL,
    @CurrentPeriodStart     DATETIME        NULL = NULL,
    @CurrentPeriodEnd       DATETIME        NULL = NULL,
    @StripeSubscriptionId   NVARCHAR(255)   NULL = NULL,
    @StripeCustomerId       NVARCHAR(255)   NULL = NULL,
    @CancelAtPeriodEnd      BIT             NULL = NULL,
    @ReminderSent14         BIT             NULL = NULL,
    @ReminderSent7          BIT             NULL = NULL,
    @ReminderSent1          BIT             NULL = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SellerSubscriptions
    SET
        Status                = COALESCE(@Status, Status),
        CurrentPeriodStart    = COALESCE(@CurrentPeriodStart, CurrentPeriodStart),
        CurrentPeriodEnd      = COALESCE(@CurrentPeriodEnd, CurrentPeriodEnd),
        StripeSubscriptionId  = COALESCE(@StripeSubscriptionId, StripeSubscriptionId),
        StripeCustomerId      = COALESCE(@StripeCustomerId, StripeCustomerId),
        CancelAtPeriodEnd     = COALESCE(@CancelAtPeriodEnd, CancelAtPeriodEnd),
        ReminderSent14        = COALESCE(@ReminderSent14, ReminderSent14),
        ReminderSent7         = COALESCE(@ReminderSent7, ReminderSent7),
        ReminderSent1         = COALESCE(@ReminderSent1, ReminderSent1),
        UpdatedAt             = GETDATE()
    WHERE SubscriptionId = @SubscriptionId;
END;
GO
