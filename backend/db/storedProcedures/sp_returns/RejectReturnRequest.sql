USE Marketplace;
GO

CREATE OR ALTER PROCEDURE RejectReturnRequest
    @ReturnRequestId VARCHAR(50),
    @SellerRejectionReason NVARCHAR(MAX),
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET Status = 'Rejected',
        SellerRejectionReason = @SellerRejectionReason,
        SellerInstructions = NULL,
        ResolutionType = NULL,
        ResolvedAt = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId;

    UPDATE Orders
    SET RefundStatus = 'ReturnRejected',
        DeliveryStatus = 'Delivered',
        UpdatedAt = GETDATE()
    WHERE OrderId = @OrderId;
END;
GO
