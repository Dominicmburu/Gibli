USE Marketplace
GO
CREATE OR ALTER PROCEDURE DecrementCartItemQuantity
    @UserId VARCHAR(50),
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentQuantity INT;

    SELECT @CurrentQuantity = Quantity
    FROM CartItems
    WHERE UserId = @UserId AND ProductId = @ProductId;

    IF @CurrentQuantity IS NOT NULL
    BEGIN
        IF @CurrentQuantity > 1
        BEGIN
            UPDATE CartItems
            SET Quantity = Quantity - 1
            WHERE UserId = @UserId AND ProductId = @ProductId;
        END
        ELSE
        BEGIN
            DELETE FROM CartItems
            WHERE UserId = @UserId AND ProductId = @ProductId;
        END
    END
END;
