USE Marketplace;
GO

-- Returns the count of Processing orders for a seller.
-- Used by the sidebar badge — do NOT use GetUserOrders for this (it loads all order data).
CREATE OR ALTER PROCEDURE GetNewOrderCount
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS NewOrderCount
    FROM Orders
    WHERE SellerId = @SellerId
      AND DeliveryStatus = 'Processing'
      AND IsDeleted = 0;
END;
GO
