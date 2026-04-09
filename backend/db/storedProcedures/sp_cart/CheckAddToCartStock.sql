USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CheckAddToCartStock
    @ProductId VARCHAR(50),
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.InStock,
        p.ProductName,
        ISNULL(ci.Quantity, 0) AS CartQty
    FROM Products p
    LEFT JOIN CartItems ci ON p.ProductId = ci.ProductId AND ci.UserId = @UserId
    WHERE p.ProductId = @ProductId;
END;
GO
