USE Marketplace;
GO

-- Called when a seller uploads proof of manual bank transfer.
-- Works for physical_return, refund_without_return, and partial_refund resolution types.
-- Marks the return as Refunded/PartialRefunded and the order as Sold.
-- Stock is only restored for physical_return (buyer sent the item back).
CREATE OR ALTER PROCEDURE MarkReturnProofUploaded
    @ReturnRequestId VARCHAR(50),
    @ProofUrl        NVARCHAR(MAX),
    @ResolutionType  NVARCHAR(50)  -- 'physical_return' | 'refund_without_return' | 'partial_refund'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderId VARCHAR(50);
    SELECT @OrderId = OrderId FROM OrderReturnRequests WHERE ReturnRequestId = @ReturnRequestId;

    -- Determine the final return status
    DECLARE @FinalStatus NVARCHAR(50);
    DECLARE @FinalRefundStatus NVARCHAR(50);
    IF @ResolutionType = 'partial_refund'
    BEGIN
        SET @FinalStatus       = 'PartialRefunded';
        SET @FinalRefundStatus = 'PartialRefunded';
    END
    ELSE
    BEGIN
        SET @FinalStatus       = 'Refunded';
        SET @FinalRefundStatus = 'Refunded';
    END

    -- Store proof and close the return request
    UPDATE OrderReturnRequests
    SET [Status]         = @FinalStatus,
        ProofUrl         = @ProofUrl,
        ProofUploadedAt  = GETDATE(),
        ResolvedAt       = ISNULL(ResolvedAt, GETDATE())
    WHERE ReturnRequestId = @ReturnRequestId;

    -- Close the order as Sold
    UPDATE Orders
    SET RefundStatus   = @FinalRefundStatus,
        DeliveryStatus = 'Sold',
        UpdatedAt      = GETDATE()
    WHERE OrderId = @OrderId;

    -- Void the seller payout — refunded orders should not be paid out
    UPDATE SellerPayouts
    SET Status = 'Voided'
    WHERE OrderId = @OrderId
      AND Status  = 'Pending';

    -- Restore stock only for physical returns (item came back to seller)
    IF @ResolutionType = 'physical_return'
    BEGIN
        -- If specific return items were logged, restore their quantities
        IF EXISTS (SELECT 1 FROM OrderReturnItems WHERE ReturnRequestId = @ReturnRequestId)
        BEGIN
            UPDATE p
            SET p.InStock = p.InStock + ri.ReturnQuantity,
                p.UpdatedAt = GETDATE()
            FROM Products p
            INNER JOIN OrderReturnItems ri ON ri.ProductId = p.ProductId
            WHERE ri.ReturnRequestId = @ReturnRequestId;
        END
        ELSE
        BEGIN
            -- No specific items — restore full order quantities
            UPDATE p
            SET p.InStock = p.InStock + oi.Quantity,
                p.UpdatedAt = GETDATE()
            FROM Products p
            INNER JOIN OrderItems oi ON oi.ProductId = p.ProductId
            WHERE oi.OrderId = @OrderId;
        END
    END
END;
GO
