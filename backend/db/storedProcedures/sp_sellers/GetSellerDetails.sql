USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetSellerDetails
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        S.UserId AS SellerId,
        S.BusinessNumber,
        S.BusinessName,
        S.Country,
        S.PaymentAccount,
        S.IsVerified,
        S.IsStoreActive,
        U.Username,
        U.Email,
        U.Role,
        U.CreatedAt,
        U.UpdatedAt,
        U.IsDeleted
    FROM Sellers AS S
    INNER JOIN Users AS U
        ON S.UserId = U.UserId
    WHERE S.UserId = @SellerId
      AND U.IsDeleted = 0;  -- Optional: skip deleted users
END;

-- EXEC GetSellerDetails '44ed8a2f-10ed-4fe7-888f-c4809da023c1'