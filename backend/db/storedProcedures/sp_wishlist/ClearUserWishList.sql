USE Marketplace
GO
CREATE or alter PROCEDURE ClearUserWishList
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM WishList
    WHERE UserId = @UserId;
END
