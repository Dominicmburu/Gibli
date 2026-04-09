USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CreateSellerPayout
    @OrderId    VARCHAR(50),
    @SellerId   VARCHAR(50),
    @Amount     DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    -- Idempotent: only create once per order
    IF NOT EXISTS (SELECT 1 FROM SellerPayouts WHERE OrderId = @OrderId)
    BEGIN
        INSERT INTO SellerPayouts (OrderId, SellerId, Amount, Status, CreatedAt)
        VALUES (@OrderId, @SellerId, @Amount, 'Pending', GETDATE());
    END

    SELECT PayoutId, OrderId, SellerId, Amount, Status, CreatedAt, PaidAt
    FROM SellerPayouts
    WHERE OrderId = @OrderId;
END;
GO
