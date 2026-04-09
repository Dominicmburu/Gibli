USE Marketplace;
GO

CREATE OR ALTER PROCEDURE InsertReviewMedia
    @MediaId   VARCHAR(50),
    @ReviewId  VARCHAR(50),
    @MediaType VARCHAR(10),
    @MediaURL  VARCHAR(2083)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO ReviewMedia (MediaId, ReviewId, MediaType, MediaURL, CreatedAt)
    VALUES (@MediaId, @ReviewId, @MediaType, @MediaURL, GETDATE());
END;
GO
