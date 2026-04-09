USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetProductReviewSummary
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    WITH review_flags AS (
        SELECT
            r.ReviewId,
            r.Rating,
            r.Comment,
            CASE WHEN p.ReviewId IS NOT NULL THEN 1 ELSE 0 END AS HasPhoto
        FROM Reviews r
        LEFT JOIN (
            SELECT DISTINCT rm.ReviewId
            FROM ReviewMedia rm
            WHERE ISNULL(rm.MediaType, 'image') = 'image'
        ) p ON p.ReviewId = r.ReviewId
        WHERE r.ProductId = @ProductId
    )
    SELECT
        CAST(ISNULL(AVG(CAST(rf.Rating AS FLOAT)), 0) AS DECIMAL(3,2)) AS AverageRating,
        COUNT(*) AS TotalReviews,
        SUM(CASE WHEN rf.Comment IS NOT NULL AND LEN(LTRIM(RTRIM(rf.Comment))) > 0 THEN 1 ELSE 0 END) AS WithContentCount,
        SUM(rf.HasPhoto) AS WithPhotosCount,
        SUM(CASE WHEN rf.Rating = 5 THEN 1 ELSE 0 END) AS Star5,
        SUM(CASE WHEN rf.Rating = 4 THEN 1 ELSE 0 END) AS Star4,
        SUM(CASE WHEN rf.Rating = 3 THEN 1 ELSE 0 END) AS Star3,
        SUM(CASE WHEN rf.Rating = 2 THEN 1 ELSE 0 END) AS Star2,
        SUM(CASE WHEN rf.Rating = 1 THEN 1 ELSE 0 END) AS Star1
    FROM review_flags rf;
END;
GO
