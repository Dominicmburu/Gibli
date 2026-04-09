USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrderReviewEligibility
    @OrderId VARCHAR(50),
    @BuyerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        oi.OrderItemId,
        oi.ProductId,
        oi.ProductName,
        oi.ProductImageUrl,
        o.DeliveryStatus,
        o.UpdatedAt,
        r.ReviewId,
        r.Rating,
        r.Comment,
        (
            SELECT
                rm.MediaId,
                ISNULL(rm.MediaType, 'image') AS MediaType,
                rm.MediaURL AS MediaUrl
            FROM ReviewMedia rm
            WHERE rm.ReviewId = r.ReviewId
            FOR JSON PATH
        ) AS Media,
        CASE
            WHEN r.ReviewId IS NULL
                AND o.DeliveryStatus IN ('Delivered', 'Sold')
                AND DATEADD(DAY, 15, ISNULL(o.DeliveredAt, ISNULL(o.UpdatedAt, o.CreatedAt))) >= GETDATE()
            THEN 1
            WHEN r.ReviewId IS NOT NULL
                AND (r.OrderId IS NULL OR r.OrderId != @OrderId)
                AND o.DeliveryStatus IN ('Delivered', 'Sold')
                AND DATEADD(DAY, 15, ISNULL(o.DeliveredAt, ISNULL(o.UpdatedAt, o.CreatedAt))) >= GETDATE()
            THEN 1
            ELSE 0
        END AS CanReview,
        CASE
            WHEN r.ReviewId IS NOT NULL AND r.OrderId = @OrderId
            THEN 1
            ELSE 0
        END AS ReviewedThisOrder,
        DATEDIFF(DAY, GETDATE(), DATEADD(DAY, 15, ISNULL(o.DeliveredAt, ISNULL(o.UpdatedAt, o.CreatedAt)))) AS DaysLeft
    FROM Orders o
    INNER JOIN OrderItems oi ON oi.OrderId = o.OrderId
    LEFT JOIN Reviews r ON r.ProductId = oi.ProductId AND r.UserId = @BuyerId
    WHERE o.OrderId = @OrderId AND o.BuyerId = @BuyerId AND o.IsDeleted = 0
    ORDER BY oi.CreatedAt DESC;
END;
GO
