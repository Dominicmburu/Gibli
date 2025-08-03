USE Marketplace
GO
CREATE or alter PROCEDURE ClearUserCart
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM CartItems
    WHERE UserId = @UserId;
END
