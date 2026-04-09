USE Marketplace;
GO

CREATE OR ALTER PROCEDURE MarkOrderRefunded
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Orders
    SET RefundStatus = 'Refunded',
        DeliveryStatus = 'Sold',
        UpdatedAt = GETDATE()
    WHERE OrderId = @OrderId;
END;
GO
