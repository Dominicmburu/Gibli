USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CheckReviewOwnershipSeller
    @ReviewId VARCHAR(50),
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 ReviewId
    FROM Reviews
    WHERE ReviewId = @ReviewId AND SellerId = @SellerId;
END;
GO
