USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsBySeller
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
        p.TotalPrice,
        p.ExpressTotalPrice,
        p.CategoryId,
        p.SubCategoryId,
        p.NeedsRestock,
        p.LowStockThreshold,
        p.CreatedAt,
        p.UpdatedAt,
        c.CategoryName,
        sc.SubCategoryName,
        -- Fetch the first image for preview purposes
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
    WHERE p.UserId = @UserId
    ORDER BY p.CreatedAt DESC;
END
GO
