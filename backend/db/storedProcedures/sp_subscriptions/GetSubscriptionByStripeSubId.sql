USE Marketplace;
GO
-- Returns a subscription row by its Stripe Subscription ID.
-- Used for idempotency: prevents duplicate records when both
-- the webhook and the verify-session endpoint run for the same event.
CREATE OR ALTER PROCEDURE GetSubscriptionByStripeSubId
    @StripeSubscriptionId VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        SubscriptionId,
        SellerId,
        Status,
        PlanId
    FROM SellerSubscriptions
    WHERE StripeSubscriptionId = @StripeSubscriptionId;
END;
GO
