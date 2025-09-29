USE Marketplace
GO
CREATE OR ALTER PROCEDURE AddToCart
    @CartItemId VARCHAR(50),
    @UserId VARCHAR(50),
    @ProductId VARCHAR(50),
    @Quantity INT = 1  
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM CartItems
        WHERE UserId = @UserId AND ProductId = @ProductId
    )
    BEGIN
        UPDATE CartItems
        SET Quantity = Quantity + @Quantity
        WHERE UserId = @UserId AND ProductId = @ProductId;
    END
    ELSE
    BEGIN
        INSERT INTO CartItems (CartItemId, UserId, ProductId)
        VALUES (@CartItemId, @UserId, @ProductId);
    END
END
