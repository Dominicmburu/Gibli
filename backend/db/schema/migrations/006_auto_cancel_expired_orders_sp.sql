-- Migration 006: AutoCancelExpiredOrders stored procedure
-- Finds all Processing orders older than 24 hours, cancels them,
-- restores stock for each item, and returns the cancelled orders
-- with buyer info so the cron job can send notification emails.
-- Run ONCE. Safe to re-run (uses CREATE OR ALTER).

CREATE OR ALTER PROCEDURE AutoCancelExpiredOrders
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Cancel expired orders and capture which ones were affected
    DECLARE @Cancelled TABLE (
        OrderId     VARCHAR(50),
        BuyerId     VARCHAR(50),
        TotalAmount DECIMAL(10, 2)
    );

    UPDATE Orders
    SET
        DeliveryStatus  = 'Cancelled',
        RejectionReason = 'Order automatically cancelled: seller did not confirm or reject within 24 hours.'
    OUTPUT
        inserted.OrderId,
        inserted.BuyerId,
        inserted.TotalAmount
    INTO @Cancelled
    WHERE DeliveryStatus = 'Processing'
      AND CreatedAt < DATEADD(HOUR, -24, GETUTCDATE());

    -- 2. Restore stock for every item belonging to a cancelled order
    UPDATE p
    SET p.InStock = p.InStock + oi.Quantity
    FROM Products p
    INNER JOIN OrderItems oi ON oi.ProductId = p.ProductId
    INNER JOIN @Cancelled   c  ON c.OrderId  = oi.OrderId;

    -- 3. Return cancelled order details + buyer info + serialised items
    --    so the caller can send one email per order without extra queries.
    SELECT
        c.OrderId,
        c.TotalAmount,
        u.Email      AS BuyerEmail,
        u.Username   AS BuyerName,
        (
            SELECT oi.OrderItemId, oi.ProductId, oi.ProductName,
                   oi.Quantity, oi.UnitPrice AS Price
            FROM OrderItems oi
            WHERE oi.OrderId = c.OrderId
            FOR JSON PATH
        ) AS OrderItems
    FROM @Cancelled c
    INNER JOIN Users u ON u.UserId = c.BuyerId;
END;
