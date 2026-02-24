USE Marketplace;
GO

CREATE OR ALTER PROCEDURE RecordCommission
    @OrderId            VARCHAR(50),
    @SellerId           VARCHAR(50),
    @SubscriptionId     INT NULL,
    @GrossAmount        DECIMAL(10,2),
    @CommissionRate     DECIMAL(5,4),
    @CommissionAmount   DECIMAL(10,2),
    @NetAmount          DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO CommissionLedger (
        OrderId, SellerId, SubscriptionId,
        GrossAmount, CommissionRate, CommissionAmount, NetAmount,
        CreatedAt
    )
    VALUES (
        @OrderId, @SellerId, @SubscriptionId,
        @GrossAmount, @CommissionRate, @CommissionAmount, @NetAmount,
        GETDATE()
    );
END;
GO
