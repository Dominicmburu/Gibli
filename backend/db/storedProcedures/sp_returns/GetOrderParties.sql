USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrderParties
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT BuyerId, SellerId
    FROM Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;
END;
GO
