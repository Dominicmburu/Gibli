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
        --Additional Extra fields for detailed information about the product in the cart
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
        
        -- Return the first image for that product
        (
            SELECT TOP 1 pi.ImageUrl 
            FROM ProductImages pi 
            WHERE pi.ProductId = p.ProductId
        ) AS ProductImageUrl
    FROM CartItems ci
    INNER JOIN Products p ON ci.ProductId = p.ProductId
    INNER JOIN Sellers s ON p.UserId = s.UserId
    WHERE ci.UserId = @UserId;
END
