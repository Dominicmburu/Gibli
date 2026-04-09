USE Marketplace;
GO

CREATE OR ALTER PROCEDURE SetOrderReturnRequested
    @OrderId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- DeliveryStatus stays as-is (Delivered or Sold) — only RefundStatus tracks the return workflow
    UPDATE Orders
    SET RefundStatus = 'ReturnRequested',
        UpdatedAt = GETDATE()
    WHERE OrderId = @OrderId
      AND DeliveryStatus IN ('Delivered', 'Sold');
END;
GO
