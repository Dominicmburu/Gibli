USE Marketplace;
GO

-- Returns all return requests for a seller's orders with reason, media count, and urgency data.
-- Used by GET /returns/seller to power the SellerReturns list view without N+1 fetches.
CREATE OR ALTER PROCEDURE GetSellerReturnSummary
    @SellerId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.ReturnRequestId,
        r.OrderId,
        r.[Status]               AS ReturnStatus,
        r.Reason,
        r.ResolutionType,
        r.SellerInstructions,
        r.SellerRejectionReason,
        r.CreatedAt              AS ReturnCreatedAt,
        r.ResolvedAt,
        o.RefundStatus,
        o.TotalAmount,
        o.DeliveryStatus,
        o.CreatedAt              AS OrderDate,
        bu.Username              AS BuyerName,
        (
            SELECT COUNT(*)
            FROM OrderReturnMedia rm
            WHERE rm.ReturnRequestId = r.ReturnRequestId
        )                        AS MediaCount,
        (
            SELECT COUNT(*)
            FROM OrderReturnItems ri
            WHERE ri.ReturnRequestId = r.ReturnRequestId
        )                        AS ReturnItemCount,
        (
            SELECT TOP 1 ri.ProductName
            FROM OrderReturnItems ri
            WHERE ri.ReturnRequestId = r.ReturnRequestId
            ORDER BY ri.CreatedAt ASC
        )                        AS FirstReturnItemName
    FROM OrderReturnRequests r
    INNER JOIN Orders o  ON r.OrderId = o.OrderId AND o.IsDeleted = 0
    INNER JOIN Users  bu ON r.BuyerId = bu.UserId
    WHERE o.SellerId = @SellerId
    ORDER BY
        CASE WHEN r.[Status] = 'Pending' THEN 0 ELSE 1 END,
        r.CreatedAt ASC;
END;
GO
