USE Marketplace
GO 
CREATE OR ALTER PROCEDURE GetUserWishList
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        wl.WishListItemId,
        wl.UserId,
        wl.ProductId,
        wl.DateAdded,
        p.ProductName,
        p.Description,
        p.Price,
        p.InStock,
        -- Return the first image for that product
        (
            SELECT TOP 1 pi.ImageUrl 
            FROM ProductImages pi 
            WHERE pi.ProductId = p.ProductId
        ) AS ProductImageUrl
    FROM WishList wl
    INNER JOIN Products p ON wl.ProductId = p.ProductId
    WHERE wl.UserId = @UserId;
END
