USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetUserOrders
    @UserId VARCHAR(50),
    @Role VARCHAR(20) = 'Buyer'   -- can be 'buyer' or 'seller'
AS
BEGIN
    SET NOCOUNT ON;

    IF @Role NOT IN ('Buyer', 'Seller', 'Admin')
    BEGIN
        RAISERROR('Invalid role. Must be buyer or seller.', 16, 1);
        RETURN;
    END;

    -- Auto-mark Delivered orders as Sold after the 14-day refund window
    -- Skip orders with an active return (RefundStatus = ReturnRequested or ReturnApproved)
    IF @Role IN ('Seller', 'Admin')
    BEGIN
        UPDATE Orders
        SET DeliveryStatus = 'Sold', UpdatedAt = GETDATE()
        WHERE DeliveryStatus = 'Delivered'
          AND DATEDIFF(DAY, COALESCE(DeliveredAt, UpdatedAt), GETDATE()) >= 14
          AND (RefundStatus IS NULL OR RefundStatus NOT IN ('ReturnRequested', 'ReturnApproved'));
    END

    SELECT
        o.OrderId,
        o.TotalAmount,
        o.DeliveryStatus,
        o.CreatedAt AS OrderDate,
        o.UpdatedAt,
        o.DeliveredAt,
        o.RefundStatus,
        o.PaymentIntentId,

        -- Buyer info (useful for sellers’ dashboard)
        bu.Username AS BuyerName,
        bu.Email AS BuyerEmail,

        -- Seller info (useful for buyers’ dashboard)
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

        -- 🧾 Nested JSON array of items per order
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
        (
            (@Role = 'Buyer' AND o.BuyerId = @UserId)
            OR
            (@Role = 'Seller' AND o.SellerId = @UserId)
            OR
            (@Role = 'Admin')

        )
        AND o.IsDeleted = 0
    ORDER BY o.CreatedAt DESC;
END;
GO
