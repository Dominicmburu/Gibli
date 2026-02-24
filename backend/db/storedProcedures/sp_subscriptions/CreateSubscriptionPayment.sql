USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CreateSubscriptionPayment
    @SubscriptionId         INT,
    @SellerId               VARCHAR(50),
    @Amount                 DECIMAL(10,2),
    @Currency               NVARCHAR(10) = 'EUR',
    @StripeInvoiceId        NVARCHAR(255) NULL,
    @StripePaymentIntentId  NVARCHAR(255) NULL,
    @Status                 NVARCHAR(20) = 'successful',
    @BillingPeriodStart     DATETIME NULL,
    @BillingPeriodEnd       DATETIME NULL,
    @PaidAt                 DATETIME NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO SubscriptionPayments (
        SubscriptionId, SellerId, Amount, Currency,
        StripeInvoiceId, StripePaymentIntentId,
        Status, BillingPeriodStart, BillingPeriodEnd,
        PaidAt, CreatedAt
    )
    VALUES (
        @SubscriptionId, @SellerId, @Amount, @Currency,
        @StripeInvoiceId, @StripePaymentIntentId,
        @Status, @BillingPeriodStart, @BillingPeriodEnd,
        @PaidAt, GETDATE()
    );

    SELECT SCOPE_IDENTITY() AS PaymentId;
END;
GO
