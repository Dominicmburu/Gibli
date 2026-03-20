-- Migration 008: Add SellerId to GetProductsToDisplay SP
-- Required so frontend can disable "Add to Cart" for a seller's own products on the home page

USE Marketplace
GO

CREATE OR ALTER PROCEDURE GetProductsToDisplay
AS
BEGIN
    SELECT
        p.ProductId,
        p.ProductName,
        p.Price,
        s.UserId AS SellerId,
        s.BusinessName,
        s.Country,
        -- Get only the first image per product
        pi.ImageUrl
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId

    OUTER APPLY (
        SELECT TOP 1 ImageUrl
        FROM ProductImages
        WHERE ProductId = p.ProductId
        ORDER BY ImageId
    ) pi
    WHERE s.IsVerified = 0 AND p.InStock > 0
END
GO
