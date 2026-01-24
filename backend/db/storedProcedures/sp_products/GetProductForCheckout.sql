USE Marketplace
GO

CREATE OR ALTER PROCEDURE GetProductForCheckout
    @ProductId VARCHAR(50),
    @UserId VARCHAR(50),
    @Quantity INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    -- Return product data in the same format as GetUserCart for checkout compatibility
    SELECT
        NEWID() AS CartItemId,  -- Generate a temporary cart item ID for buy now
        @UserId AS UserId,
        p.ProductId,
        @Quantity AS Quantity,
        GETDATE() AS DateAdded,
        p.ProductName,
        p.Description,
        p.Price,
        p.InStock,
        p.CategoryId,
        p.SubCategoryId,
        p.ShippingPrice,
        p.TotalPrice,
        p.ExpressShippingPrice,
        p.ExpressTotalPrice,
        p.UserId AS SellerId,
        s.BusinessName AS SellerName,
        s.BusinessNumber AS SellerVATNumber,
        s.Country AS SellerCountry,
        (
            SELECT TOP 1 pi.ImageUrl
            FROM ProductImages pi
            WHERE pi.ProductId = p.ProductId
        ) AS ProductImageUrl
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId
    WHERE p.ProductId = @ProductId;
END
