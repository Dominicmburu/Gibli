USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrderForReturn
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT OrderId, BuyerId, DeliveryStatus, DeliveredAt, UpdatedAt, RefundStatus
    FROM Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;
END;
GO
