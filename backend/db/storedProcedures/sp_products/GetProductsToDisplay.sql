USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsToDisplay
AS
BEGIN
    SELECT 
        p.ProductId,
        p.ProductName,
        p.Description,
        p.InStock,
        p.Price,
        p.CreatedAt,
        p.UpdatedAt,
        s.BusinessName,
        s.Country,
        -- Get only the first image per product (can be changed if needed)
        pi.ImageUrl
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId

    OUTER APPLY (
        SELECT TOP 1 ImageUrl 
        FROM ProductImages 
        WHERE ProductId = p.ProductId
        ORDER BY ImageId -- assuming ImageId reflects upload order
    ) pi
    WHERE s.IsVerified = 0
END
