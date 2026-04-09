USE Marketplace;
GO

-- Returns all pending return requests that have been waiting for more than 3 days
-- Used by the cron job to auto-approve seller-ignored returns
CREATE OR ALTER PROCEDURE GetOverdueReturnRequests
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.ReturnRequestId,
        r.OrderId,
        r.BuyerId,
        r.Reason,
        r.CreatedAt,
        o.SellerId,
        o.PaymentIntentId,
        o.TotalAmount,
        bu.Email    AS BuyerEmail,
        bu.Username AS BuyerName,
        su.Email         AS SellerEmail,
        s.BusinessName   AS SellerBusinessName
    FROM OrderReturnRequests r
    INNER JOIN Orders  o  ON r.OrderId  = o.OrderId   AND o.IsDeleted = 0
    INNER JOIN Users   bu ON r.BuyerId  = bu.UserId
    INNER JOIN Sellers s  ON o.SellerId = s.UserId
    INNER JOIN Users   su ON o.SellerId = su.UserId
    WHERE r.Status = 'Pending'
      AND DATEDIFF(DAY, r.CreatedAt, GETDATE()) >= 3;
END;
GO
