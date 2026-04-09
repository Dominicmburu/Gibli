USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CheckReviewOwnershipBuyer
    @ReviewId VARCHAR(50),
    @UserId   VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 ReviewId
    FROM Reviews
    WHERE ReviewId = @ReviewId AND UserId = @UserId;
END;
GO
