USE Marketplace
GO
CREATE OR ALTER PROCEDURE ToggleSellerVerification
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentStatus BIT;

    SELECT @CurrentStatus = IsVerified FROM Sellers WHERE UserId = @UserId;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('Seller not found.', 16, 1);
        RETURN;
    END

    UPDATE Sellers
    SET IsVerified = CASE WHEN @CurrentStatus = 1 THEN 0 ELSE 1 END
    WHERE UserId = @UserId;

    SELECT 
        UserId,
        BusinessName,
        IsVerified
    FROM Sellers
    WHERE UserId = @UserId;
END
GO
