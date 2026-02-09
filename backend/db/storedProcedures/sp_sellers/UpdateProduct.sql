USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateProduct
    @ProductId VARCHAR(50),
    @ProductName NVARCHAR(50),
    @CategoryId VARCHAR(50),
    @SubCategoryId VARCHAR(50),
    @Price DECIMAL(10, 2),
    @Description NVARCHAR(MAX),
    @InStock INT,
    @ShippingPrice DECIMAL(10, 2),
    @ExpressShippingPrice DECIMAL(10, 2)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Products
    SET ProductName = @ProductName,
        CategoryId = @CategoryId,
        SubCategoryId = @SubCategoryId,
        Price = @Price,
        Description = @Description,
        InStock = @InStock,
        ShippingPrice = @ShippingPrice,
        ExpressShippingPrice = @ExpressShippingPrice,
        UpdatedAt = GETDATE()
    WHERE ProductId = @ProductId;

    -- Return updated product with image
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
        p.CreatedAt,
        p.UpdatedAt,
        pi.ImageUrl
    FROM Products p
    OUTER APPLY (
        SELECT TOP 1 ImageUrl
        FROM ProductImages
        WHERE ProductId = p.ProductId
        ORDER BY ImageId
    ) pi
    WHERE p.ProductId = @ProductId;
END
GO
