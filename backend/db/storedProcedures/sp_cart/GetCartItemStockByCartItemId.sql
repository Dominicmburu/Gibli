USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetCartItemStockByCartItemId
    @CartItemId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.InStock,
        p.ProductName
    FROM CartItems ci
    INNER JOIN Products p ON ci.ProductId = p.ProductId
    WHERE ci.CartItemId = @CartItemId;
END;
GO
