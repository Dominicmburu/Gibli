USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetCommissionRefundRequests
    @SellerId   VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        cfr.RequestId,
        cfr.OrderId,
        cfr.ReturnRequestId,
        cfr.SellerId,
        cfr.CommissionAmount,
        cfr.Status,
        cfr.SellerNote,
        cfr.AdminNote,
        cfr.CreatedAt,
        cfr.ResolvedAt,
        o.TotalAmount AS OrderTotal
    FROM CommissionRefundRequests cfr
    INNER JOIN Orders o ON cfr.OrderId = o.OrderId
    WHERE cfr.SellerId = @SellerId
    ORDER BY cfr.CreatedAt DESC;
END;
GO
