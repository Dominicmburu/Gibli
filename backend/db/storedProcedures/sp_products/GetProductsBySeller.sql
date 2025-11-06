-- USE Marketplace
-- GO
-- CREATE OR ALTER PROCEDURE GetProductsBySeller(@UserId VARCHAR(50))
-- AS
-- BEGIN
--     SELECT * FROM Products WHERE UserId = @UserId
-- END 
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
        p.CreatedAt,
        p.UpdatedAt,
        -- Fetch the first image for preview purposes
        pi.ImageUrl
    FROM Products p
    OUTER APPLY (
        SELECT TOP 1 ImageUrl 
        FROM ProductImages 
        WHERE ProductId = p.ProductId
        ORDER BY ImageId -- assumes sequential image IDs
    ) pi
    WHERE p.UserId = @UserId
    ORDER BY p.CreatedAt DESC;
END
