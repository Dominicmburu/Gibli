USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CancelOrder
    @OrderId VARCHAR(50),
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if order exists and belongs to this buyer
    DECLARE @CurrentStatus NVARCHAR(50);
    DECLARE @BuyerId VARCHAR(50);

    SELECT @CurrentStatus = DeliveryStatus, @BuyerId = BuyerId
    FROM Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;

    IF @BuyerId IS NULL
    BEGIN
        RAISERROR('Order not found.', 16, 1);
        RETURN;
    END

    IF @BuyerId != @UserId
    BEGIN
        RAISERROR('You are not authorized to cancel this order.', 16, 1);
        RETURN;
    END

    IF @CurrentStatus != 'Processing'
    BEGIN
        RAISERROR('Only orders with status "Processing" can be cancelled. This order is already %s.', 16, 1, @CurrentStatus);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Restore stock for each item in this order
        UPDATE p
        SET p.InStock = p.InStock + oi.Quantity
        FROM Products p
        INNER JOIN OrderItems oi ON p.ProductId = oi.ProductId
        WHERE oi.OrderId = @OrderId;

        -- 2. Update order status to Cancelled
        UPDATE Orders
        SET DeliveryStatus = 'Cancelled', UpdatedAt = GETDATE()
        WHERE OrderId = @OrderId;

        COMMIT TRANSACTION;

        -- Return the updated order (include PaymentIntentId so the route can issue a Stripe refund)
        SELECT OrderId, DeliveryStatus, UpdatedAt, PaymentIntentId
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
