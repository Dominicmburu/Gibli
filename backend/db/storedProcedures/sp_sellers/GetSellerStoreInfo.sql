USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetSellerStoreInfo
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.BusinessName,
        s.Country,
        s.ReturnAddress,
        u.Username,
        u.Email
    FROM Sellers s
    INNER JOIN Users u ON u.UserId = s.UserId
    WHERE s.UserId = @SellerId
      AND u.IsDeleted = 0;
END;
GO
