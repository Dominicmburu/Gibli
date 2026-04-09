USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CheckReviewEligibility
    @BuyerId VARCHAR(50),
    @OrderId VARCHAR(50),
    @OrderItemId VARCHAR(50),
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        o.SellerId,
        o.DeliveryStatus,
        ISNULL(o.DeliveredAt, ISNULL(o.UpdatedAt, o.CreatedAt)) AS DeliveredAt,
        CASE
            WHEN o.DeliveryStatus IN ('Delivered', 'Sold')
                AND DATEADD(DAY, 15, ISNULL(o.DeliveredAt, ISNULL(o.UpdatedAt, o.CreatedAt))) >= GETDATE()
            THEN 1
            ELSE 0
        END AS IsEligible
    FROM Orders o
    INNER JOIN OrderItems oi ON oi.OrderId = o.OrderId
    WHERE
        o.BuyerId = @BuyerId
        AND o.OrderId = @OrderId
        AND oi.OrderItemId = @OrderItemId
        AND oi.ProductId = @ProductId;
END;
GO
