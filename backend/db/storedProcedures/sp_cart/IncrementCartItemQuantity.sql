USE Marketplace
GO
CREATE OR ALTER PROCEDURE IncrementCartItemQuantity
    @UserId VARCHAR(50),
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM CartItems
        WHERE UserId = @UserId AND ProductId = @ProductId
    )
    BEGIN
        UPDATE CartItems
        SET Quantity = Quantity + 1
        WHERE UserId = @UserId AND ProductId = @ProductId;
    END
END;
