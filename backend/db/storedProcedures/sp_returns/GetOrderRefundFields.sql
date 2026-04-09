USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrderRefundFields
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DeliveredAt, RefundStatus
    FROM Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;
END;
GO
