USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetNeedsRestockProducts
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.ProductId,
        p.ProductName,
        p.Description,
        p.InStock,
        p.Price,
        p.ShippingPrice,
        p.ExpressShippingPrice,
        p.CategoryId,
        p.SubCategoryId,
        p.NeedsRestock,
        p.CreatedAt,
        p.UpdatedAt,
        c.CategoryName,
        sc.SubCategoryName,
        pi.ImageUrl
    FROM Products p
    LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
    LEFT JOIN SubCategories sc ON p.SubCategoryId = sc.SubCategoryId
    OUTER APPLY (
        SELECT TOP 1 ImageUrl
        FROM ProductImages
        WHERE ProductId = p.ProductId
        ORDER BY ImageId
    ) pi
    WHERE p.UserId = @UserId AND p.NeedsRestock = 1
    ORDER BY p.InStock ASC, p.UpdatedAt DESC;
END;
GO
