USE Marketplace;
GO

CREATE OR ALTER PROCEDURE QuickRemoveProductFromWishlist
    @UserId VARCHAR(50),
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @WishListItemId VARCHAR(50);

    -- Step 1: Get the WishlistItemId that matches the product and user
    SELECT TOP 1 @WishListItemId = WishListItemId
    FROM WishList
    WHERE ProductId = @ProductId AND UserId = @UserId;

    -- Step 2: If the item exists, delete it
    IF @WishListItemId IS NOT NULL
    BEGIN
        DELETE FROM WishList
        WHERE WishListItemId = @WishListItemId;

        
    END
    
END;
GO
