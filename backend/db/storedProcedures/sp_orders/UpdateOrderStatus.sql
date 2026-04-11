USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateOrderStatus
    @OrderId VARCHAR(50),
    @SellerId VARCHAR(50),
    @NewStatus NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentStatus NVARCHAR(50);
    DECLARE @CurrentRefundStatus NVARCHAR(50);
    DECLARE @OrderSellerId VARCHAR(50);

    SELECT @CurrentStatus = DeliveryStatus, @CurrentRefundStatus = RefundStatus, @OrderSellerId = SellerId
    FROM Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;

    -- Validate order exists
    IF @OrderSellerId IS NULL
    BEGIN
        RAISERROR('Order not found.', 16, 1);
        RETURN;
    END

    -- Validate seller owns this order
    IF @OrderSellerId != @SellerId
    BEGIN
        RAISERROR('You are not authorized to update this order.', 16, 1);
        RETURN;
    END

    -- Block delivery status changes while a return is active (check RefundStatus, not DeliveryStatus)
    IF @CurrentRefundStatus IN ('ReturnRequested', 'ReturnApproved')
    BEGIN
        RAISERROR('This order is in a return / refund workflow. Use the return tools on the order page.', 16, 1);
        RETURN;
    END

    -- Validate status transitions
    -- Processing -> Confirmed (accept) or Rejected (reject)
    -- Confirmed -> Shipped
    -- Shipped -> Delivered

    IF @NewStatus = 'Confirmed' AND @CurrentStatus != 'Processing'
    BEGIN
        RAISERROR('Can only confirm orders that are Processing. Current status: %s', 16, 1, @CurrentStatus);
        RETURN;
    END

    IF @NewStatus = 'Rejected' AND @CurrentStatus != 'Processing'
    BEGIN
        RAISERROR('Can only reject orders that are Processing. Current status: %s', 16, 1, @CurrentStatus);
        RETURN;
    END

    IF @NewStatus = 'Shipped' AND @CurrentStatus != 'Confirmed'
    BEGIN
        RAISERROR('Can only ship orders that are Confirmed. Current status: %s', 16, 1, @CurrentStatus);
        RETURN;
    END

    IF @NewStatus = 'Delivered' AND @CurrentStatus != 'Shipped'
    BEGIN
        RAISERROR('Can only deliver orders that are Shipped. Current status: %s', 16, 1, @CurrentStatus);
        RETURN;
    END

    IF @NewStatus = 'Sold' AND @CurrentStatus != 'Delivered'
    BEGIN
        RAISERROR('Can only mark orders as Sold when they are Delivered. Current status: %s', 16, 1, @CurrentStatus);
        RETURN;
    END

    -- Validate that NewStatus is one of the allowed values
    IF @NewStatus IN ('ReturnRequested', 'ReturnApproved')
    BEGIN
        RAISERROR('Return statuses are managed automatically when buyers or sellers use the return workflow.', 16, 1);
        RETURN;
    END

    IF @NewStatus NOT IN ('Confirmed', 'Rejected', 'Shipped', 'Delivered', 'Sold')
    BEGIN
        RAISERROR('Invalid status: %s', 16, 1, @NewStatus);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- If rejecting, restore stock (same as cancel)
        IF @NewStatus = 'Rejected'
        BEGIN
            UPDATE p
            SET p.InStock = p.InStock + oi.Quantity
            FROM Products p
            INNER JOIN OrderItems oi ON p.ProductId = oi.ProductId
            WHERE oi.OrderId = @OrderId;
        END

        -- Update order status
        UPDATE Orders
        SET DeliveryStatus = @NewStatus, UpdatedAt = GETDATE()
        WHERE OrderId = @OrderId;

        -- On Delivered: create a seller payout record for the full order amount
        IF @NewStatus = 'Delivered'
        BEGIN
            DECLARE @TotalAmount DECIMAL(10,2);
            SELECT @TotalAmount = TotalAmount FROM Orders WHERE OrderId = @OrderId;
            IF NOT EXISTS (SELECT 1 FROM SellerPayouts WHERE OrderId = @OrderId)
            BEGIN
                INSERT INTO SellerPayouts (OrderId, SellerId, Amount, Status, CreatedAt)
                VALUES (@OrderId, @SellerId, @TotalAmount, 'Pending', GETDATE());
            END
        END

        COMMIT TRANSACTION;

        -- Return updated order
        SELECT OrderId, DeliveryStatus, UpdatedAt
        FROM Orders
        WHERE OrderId = @OrderId;
    END TRY

    BEGIN CATCH
        ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();

        RAISERROR(@ErrMsg, @ErrSeverity, @ErrState);
    END CATCH
END;
GO
