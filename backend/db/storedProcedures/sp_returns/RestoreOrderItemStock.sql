USE Marketplace;
GO

CREATE OR ALTER PROCEDURE RestoreOrderItemStock
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE p
    SET p.InStock = p.InStock + oi.Quantity
    FROM Products p
    INNER JOIN OrderItems oi ON p.ProductId = oi.ProductId
    WHERE oi.OrderId = @OrderId;
END;
GO
