USE Marketplace
GO

CREATE OR ALTER PROCEDURE GetProductDetails
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        P.ProductId,
        P.ProductName,
        P.Description,
        P.InStock,
        P.Price,
        P.ShippingPrice,
        P.ExpressShippingPrice,
        P.TotalPrice,
        P.ExpressTotalPrice,
        P.CreatedAt,
        P.UpdatedAt,

        -- Category info
        C.CategoryId,
        C.CategoryName,

        -- SubCategory info
        SC.SubCategoryId,
        SC.SubCategoryName,

        -- Seller info
        S.UserId AS SellerId,
        S.BusinessNumber,
        S.BusinessName,
        S.Country,
        S.IsVerified,

        -- Product images as JSON array
        (
            SELECT 
                PI.ImageId,
                PI.ImageUrl
            FROM ProductImages PI
            WHERE PI.ProductId = P.ProductId
            FOR JSON PATH
        ) AS ProductImages

    FROM Products P
    INNER JOIN Categories C ON P.CategoryId = C.CategoryId
    INNER JOIN Sellers S ON P.UserId = S.UserId
    INNER JOIN SubCategories SC ON P.SubCategoryId = SC.SubCategoryId
    WHERE P.ProductId = @ProductId;
END;
