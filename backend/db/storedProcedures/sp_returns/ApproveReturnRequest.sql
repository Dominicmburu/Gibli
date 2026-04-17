USE Marketplace;
GO

CREATE OR ALTER PROCEDURE ApproveReturnRequest
    @ReturnRequestId    VARCHAR(50),
    @SellerInstructions NVARCHAR(MAX),
    @OrderId            VARCHAR(50),
    @ResolutionType     NVARCHAR(50)   = 'physical_return',
    @PartialRefundAmount DECIMAL(10,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET Status               = 'Approved',
        SellerInstructions   = @SellerInstructions,
        SellerRejectionReason = NULL,
        ResolutionType       = @ResolutionType,
        PartialRefundAmount  = @PartialRefundAmount,
        ResolvedAt           = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId;

    -- DeliveryStatus stays Delivered — RefundStatus tracks return workflow
    UPDATE Orders
    SET RefundStatus = 'ReturnApproved'
    WHERE OrderId = @OrderId;
END;
GO
