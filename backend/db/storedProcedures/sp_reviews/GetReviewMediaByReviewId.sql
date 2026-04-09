USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetReviewMediaByReviewId
    @ReviewId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT MediaId, ISNULL(MediaType, 'image') AS MediaType
    FROM ReviewMedia
    WHERE ReviewId = @ReviewId;
END;
GO
