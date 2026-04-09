USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetSellerPayouts
    @SellerId   VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        sp.PayoutId,
        sp.OrderId,
        sp.SellerId,
        sp.Amount,
        sp.Status,
        sp.CreatedAt,
        sp.PaidAt,
        sp.AdminNote,
        o.DeliveryStatus,
        o.TotalAmount AS OrderTotal
    FROM SellerPayouts sp
    INNER JOIN Orders o ON sp.OrderId = o.OrderId
    WHERE sp.SellerId = @SellerId
    ORDER BY sp.CreatedAt DESC;
END;
GO
