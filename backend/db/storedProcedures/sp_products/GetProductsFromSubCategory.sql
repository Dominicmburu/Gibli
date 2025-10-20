USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsFromSubCategory(
    @SubCategoryId VARCHAR(50)
)
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
        pi.ImageUrl
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId
    OUTER APPLY (
        SELECT TOP 1 ImageUrl 
        FROM ProductImages 
        WHERE ProductId = p.ProductId
        ORDER BY ImageId
    ) pi
    WHERE p.SubCategoryId = @SubCategoryId
END
