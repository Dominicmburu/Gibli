USE Marketplace
GO 
CREATE OR ALTER PROCEDURE GetUserCart
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        ci.CartItemId,
        ci.UserId,
        ci.ProductId,
        ci.Quantity,
        ci.DateAdded,
        p.ProductName,
        p.Description,
        p.Price,
        p.InStock,
        -- Return the first image for that product
        (
            SELECT TOP 1 pi.ImageUrl 
            FROM ProductImages pi 
            WHERE pi.ProductId = p.ProductId
        ) AS ProductImageUrl
    FROM CartItems ci
    INNER JOIN Products p ON ci.ProductId = p.ProductId
    WHERE ci.UserId = @UserId;
END
