USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateCartItem
    @CartItemId VARCHAR(50),
    @Quantity INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE CartItems
    SET Quantity = @Quantity
    WHERE CartItemId = @CartItemId;
END
