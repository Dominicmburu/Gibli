USE Marketplace;
GO

CREATE OR ALTER PROCEDURE DeleteReviewMedia
    @MediaId  VARCHAR(50),
    @ReviewId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM ReviewMedia
    WHERE MediaId = @MediaId AND ReviewId = @ReviewId;
END;
GO
