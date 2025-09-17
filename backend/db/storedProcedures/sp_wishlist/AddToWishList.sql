USE Marketplace
GO
CREATE OR ALTER PROCEDURE AddToWishList
    @WishListItemId VARCHAR(50),
    @UserId VARCHAR(50),
    @ProductId VARCHAR(50)  
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN
        INSERT INTO WishList (WishListItemId, UserId, ProductId)
        VALUES (@WishListItemId, @UserId, @ProductId);
    END
END
