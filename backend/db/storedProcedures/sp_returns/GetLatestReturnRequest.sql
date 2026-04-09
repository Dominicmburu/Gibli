USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetLatestReturnRequest
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        ReturnRequestId, OrderId, BuyerId, Reason, [Status],
        SellerInstructions, SellerRejectionReason, ResolutionType,
        PartialRefundAmount,
        BuyerTrackingNumber, BuyerTrackingUrl, BuyerShippedAt,
        CreatedAt, ResolvedAt
    FROM OrderReturnRequests
    WHERE OrderId = @OrderId
    ORDER BY CreatedAt DESC;
END;
GO
