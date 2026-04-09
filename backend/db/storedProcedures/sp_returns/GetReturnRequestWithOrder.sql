USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetReturnRequestWithOrder
    @ReturnRequestId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.ReturnRequestId,
        r.OrderId,
        r.[Status]                AS Status,
        r.BuyerId,
        r.Reason,
        r.SellerInstructions,
        r.SellerRejectionReason,
        r.ResolutionType,
        r.PartialRefundAmount,
        r.BuyerTrackingNumber,
        r.BuyerTrackingUrl,
        r.BuyerShippedAt,
        r.CreatedAt,
        r.ResolvedAt,
        o.SellerId,
        o.RefundStatus,
        o.PaymentIntentId,
        o.TotalAmount,
        bu.Email    AS BuyerEmail,
        bu.Username AS BuyerName,
        su.Email         AS SellerEmail,
        s.BusinessName   AS SellerBusinessName
    FROM OrderReturnRequests r
    INNER JOIN Orders  o  ON o.OrderId  = r.OrderId   AND o.IsDeleted = 0
    INNER JOIN Users   bu ON bu.UserId  = r.BuyerId
    INNER JOIN Sellers s  ON s.UserId   = o.SellerId
    INNER JOIN Users   su ON su.UserId  = o.SellerId
    WHERE r.ReturnRequestId = @ReturnRequestId;
END;
GO
