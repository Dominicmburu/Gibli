-- Migration 009: Add TrackingNumber, TrackingUrl, RejectionReason to GetOrderById SP
-- Required so order detail pages (buyer + seller) can display tracking info and rejection reasons

USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrderById
    @OrderId VARCHAR(50),
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.OrderId,
        o.BuyerId,
        o.SellerId,
        o.TotalAmount,
        o.DeliveryStatus,
        o.CreatedAt AS OrderDate,
        o.UpdatedAt,
        o.PaymentIntentId,
        o.TrackingNumber,
        o.TrackingUrl,
        o.RejectionReason,

        -- Buyer info
        bu.Username AS BuyerName,
        bu.Email AS BuyerEmail,

        -- Seller info
        s.BusinessName AS SellerName,
        s.Country AS SellerCountry,
        s.BusinessNumber AS SellerBusinessNumber,

        -- Shipping snapshot
        osd.FullName,
        osd.PhoneNumber,
        osd.AddressLine1,
        osd.AddressLine2,
        osd.City,
        osd.StateOrProvince,
        osd.PostalCode,
        osd.Country AS ShippingCountry,

        -- Nested JSON array of items
        (
            SELECT
                oi.OrderItemId,
                oi.ProductId,
                oi.ProductName,
                oi.Description,
                oi.ProductImageUrl,
                oi.Quantity,
                oi.UnitPrice,
                oi.ShippingPrice,
                (oi.Quantity * oi.UnitPrice + oi.ShippingPrice) AS ItemTotal,
                CASE
                    WHEN oi.ShippingPrice = p.ExpressShippingPrice THEN 'Express'
                    ELSE 'Standard'
                END AS ShippingType
            FROM OrderItems oi
            INNER JOIN Products p ON oi.ProductId = p.ProductId
            WHERE oi.OrderId = o.OrderId
            FOR JSON PATH
        ) AS OrderItems

    FROM Orders o
    INNER JOIN Sellers s ON o.SellerId = s.UserId
    INNER JOIN Users bu ON o.BuyerId = bu.UserId
    INNER JOIN OrderShippingDetails osd ON o.OrderId = osd.OrderId
    WHERE
        o.OrderId = @OrderId
        AND o.IsDeleted = 0
        AND (o.BuyerId = @UserId OR o.SellerId = @UserId);
END;
GO
