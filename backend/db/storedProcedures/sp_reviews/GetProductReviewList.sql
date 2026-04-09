USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetProductReviewList
    @ProductId     VARCHAR(50),
    @Filter        NVARCHAR(50),
    @Star          INT,
    @Offset        INT,
    @Limit         INT,
    @Sort          NVARCHAR(50),
    @CurrentUserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    WITH filtered_reviews AS (
        SELECT r.*
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
            )
    ),
    ordered_reviews AS (
        SELECT *
        FROM filtered_reviews
        ORDER BY
            CASE WHEN @Filter = 'latest' OR @Sort = 'latest' THEN 1 ELSE 0 END DESC,
            ISNULL(UpdatedAt, CreatedAt) DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    )
    SELECT
        r.ReviewId,
        r.ProductId,
        r.OrderId,
        r.OrderItemId,
        r.UserId,
        r.Rating,
        r.Comment,
        r.CreatedAt,
        r.UpdatedAt,
        r.SellerId,
        r.SellerResponse,
        r.SellerResponseAt,
        u.Username,
        (
            SELECT
                rm.MediaId,
                ISNULL(rm.MediaType, 'image') AS MediaType,
                rm.MediaURL AS MediaUrl
            FROM ReviewMedia rm
            WHERE rm.ReviewId = r.ReviewId
            FOR JSON PATH
        ) AS Media,
        ISNULL((
            SELECT SUM(CASE WHEN hv.IsHelpful = 1 THEN 1 ELSE 0 END)
            FROM ReviewHelpfulVotes hv
            WHERE hv.ReviewId = r.ReviewId
        ), 0) AS HelpfulCount,
        CASE
            WHEN @CurrentUserId IS NULL THEN 0
            WHEN EXISTS (
                SELECT 1 FROM ReviewHelpfulVotes hv
                WHERE hv.ReviewId = r.ReviewId AND hv.UserId = @CurrentUserId AND hv.IsHelpful = 1
            ) THEN 1 ELSE 0
        END AS IsHelpfulByCurrentUser
    FROM ordered_reviews r
    INNER JOIN Users u ON u.UserId = r.UserId
    ORDER BY ISNULL(r.UpdatedAt, r.CreatedAt) DESC;
END;
GO
