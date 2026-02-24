USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateSellerStripeCustomerId
    @SellerId           VARCHAR(50),
    @StripeCustomerId   NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Sellers
    SET StripeCustomerId = @StripeCustomerId
    WHERE UserId = @SellerId;
END;
GO
