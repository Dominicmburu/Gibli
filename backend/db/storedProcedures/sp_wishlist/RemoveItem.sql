USE Marketplace
GO
CREATE OR ALTER PROCEDURE RemoveItem
    @WishListItemId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM WishList
    WHERE WishListItemId = @WishListItemId;
END
