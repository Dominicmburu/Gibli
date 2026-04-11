USE Marketplace;
GO

CREATE OR ALTER PROCEDURE MarkOrderRefunded
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Orders
    SET RefundStatus = 'Refunded',
        DeliveryStatus = 'Sold',
        UpdatedAt = GETDATE()
    WHERE OrderId = @OrderId;

    -- Void the seller payout so the marketplace does not pay out on a refunded order
    UPDATE SellerPayouts
    SET Status = 'Voided',
        UpdatedAt = GETDATE()
    WHERE OrderId = @OrderId
      AND Status = 'Pending';
END;
GO
