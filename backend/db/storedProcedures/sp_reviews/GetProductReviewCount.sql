USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetProductReviewCount
    @ProductId VARCHAR(50),
    @Filter    NVARCHAR(50),
    @Star      INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS Total
    FROM Reviews r
    WHERE
        r.ProductId = @ProductId
        AND (@Star IS NULL OR r.Rating = @Star)
        AND (
            @Filter = 'all'
            OR @Filter = 'latest'
            OR (@Filter = 'content' AND r.Comment IS NOT NULL AND LEN(LTRIM(RTRIM(r.Comment))) > 0)
            OR (@Filter = 'photos' AND EXISTS (
                SELECT 1 FROM ReviewMedia rm
                WHERE rm.ReviewId = r.ReviewId AND ISNULL(rm.MediaType, 'image') = 'image'
            ))
        );
END;
GO
