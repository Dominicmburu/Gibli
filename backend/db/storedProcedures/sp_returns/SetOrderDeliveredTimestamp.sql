USE Marketplace;
GO

CREATE OR ALTER PROCEDURE SetOrderDeliveredTimestamp
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Orders
    SET DeliveredAt = COALESCE(DeliveredAt, GETDATE())
    WHERE OrderId = @OrderId AND IsDeleted = 0;
END;
GO
