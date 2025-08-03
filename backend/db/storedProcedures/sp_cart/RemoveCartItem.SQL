USE Marketplace
GO
CREATE OR ALTER PROCEDURE RemoveCartItem
    @CartItemId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM CartItems
    WHERE CartItemId = @CartItemId;
END
