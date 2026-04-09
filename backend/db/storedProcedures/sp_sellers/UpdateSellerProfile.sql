USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateSellerProfile
    @SellerId     VARCHAR(50),
    @BusinessName NVARCHAR(255),
    @ReturnAddress NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Sellers
    SET BusinessName  = @BusinessName,
        ReturnAddress = @ReturnAddress
    WHERE UserId = @SellerId;
END;
GO
