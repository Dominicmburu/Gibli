USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CheckExistingReview
    @ProductId VARCHAR(50),
    @BuyerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 ReviewId
    FROM Reviews
    WHERE ProductId = @ProductId AND UserId = @BuyerId;
END;
GO
