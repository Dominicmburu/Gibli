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
        r.ProofUrl,
        r.ProofUploadedAt,
        r.ExchangeTrackingNumber,
        r.ExchangeTrackingUrl,
        r.ExchangeShippedAt,
        r.ExchangeDeliveredAt,
        r.CreatedAt,
        r.ResolvedAt,
        o.SellerId,
        o.RefundStatus,
        o.PaymentIntentId,
        o.TotalAmount,
        bu.Email         AS BuyerEmail,
        bu.Username      AS BuyerName,
        su.Email         AS SellerEmail,
        s.BusinessName   AS SellerBusinessName,
        -- Recorded commission (from checkout webhook) takes priority
        COALESCE(cl.CommissionRate,   planInfo.CommissionRate)                                   AS CommissionRate,
        COALESCE(cl.CommissionAmount, ROUND(o.TotalAmount * planInfo.CommissionRate, 2))         AS CommissionAmount
    FROM OrderReturnRequests r
    INNER JOIN Orders  o  ON o.OrderId = r.OrderId AND o.IsDeleted = 0
    INNER JOIN Users   bu ON bu.UserId = r.BuyerId
    INNER JOIN Sellers s  ON s.UserId  = o.SellerId
    INNER JOIN Users   su ON su.UserId = o.SellerId
    -- Recorded commission ledger entry (may not exist for older/test orders)
    LEFT JOIN CommissionLedger cl ON cl.OrderId = r.OrderId
    -- Seller's best subscription plan: active first, then most recently created
    OUTER APPLY (
        SELECT TOP 1 sp2.CommissionRate
        FROM SellerSubscriptions ss2
        INNER JOIN SubscriptionPlans sp2 ON sp2.PlanId = ss2.PlanId
        WHERE ss2.SellerId = o.SellerId
        ORDER BY
            CASE WHEN ss2.Status = 'active' THEN 0 ELSE 1 END,
            ss2.CreatedAt DESC
    ) planInfo
    WHERE r.ReturnRequestId = @ReturnRequestId;
END;
GO
