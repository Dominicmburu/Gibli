USE Marketplace;
GO

-- Marks the exchange replacement as delivered and closes the return as Sold.
-- No money is involved; the order is simply completed.
CREATE OR ALTER PROCEDURE MarkExchangeDelivered
    @ReturnRequestId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderId VARCHAR(50);
    SELECT @OrderId = OrderId FROM OrderReturnRequests WHERE ReturnRequestId = @ReturnRequestId;

    UPDATE OrderReturnRequests
    SET ExchangeDeliveredAt = GETDATE(),
        [Status]            = 'Refunded',   -- "Refunded" here = resolved/complete
        ResolvedAt          = ISNULL(ResolvedAt, GETDATE())
    WHERE ReturnRequestId = @ReturnRequestId;

    -- Close the order as Sold — exchange is complete
    UPDATE Orders
    SET RefundStatus   = 'Refunded',
        DeliveryStatus = 'Sold',
        UpdatedAt      = GETDATE()
    WHERE OrderId = @OrderId;
END;
GO
