USE Marketplace;
GO

-- Returns all OrderItems for a given order (used for return item validation)
CREATE OR ALTER PROCEDURE GetOrderItems
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT OrderItemId, ProductId, ProductName, Quantity, UnitPrice, ShippingPrice
    FROM OrderItems
    WHERE OrderId = @OrderId;
END;
GO
