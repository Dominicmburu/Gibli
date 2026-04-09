USE Marketplace;
GO

CREATE OR ALTER PROCEDURE ProcessPartialRefund
    @ReturnRequestId VARCHAR(50),
    @OrderId         VARCHAR(50),
    @Amount          DECIMAL(10,2),
    @SellerNote      NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Mark the return request as PartialRefunded
    UPDATE OrderReturnRequests
    SET [Status]            = 'PartialRefunded',
        PartialRefundAmount = @Amount,
        ResolutionType      = 'partial_refund',
        SellerInstructions  = @SellerNote,
        ResolvedAt          = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId;

    -- Update the order: buyer keeps item so no stock change; close out the return
    UPDATE Orders
    SET RefundStatus   = 'PartialRefunded',
        DeliveryStatus = 'Sold',
        UpdatedAt      = GETDATE()
    WHERE OrderId = @OrderId;
END;
GO
