USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpsertCommissionRefundRequest
    @OrderId            VARCHAR(50),
    @ReturnRequestId    UNIQUEIDENTIFIER NULL,
    @SellerId           VARCHAR(50),
    @CommissionAmount   DECIMAL(10,2),
    @SellerNote         NVARCHAR(500)   NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Only one request per order
    IF EXISTS (SELECT 1 FROM CommissionRefundRequests WHERE OrderId = @OrderId AND SellerId = @SellerId)
    BEGIN
        RAISERROR('A commission refund request already exists for this order.', 16, 1);
        RETURN;
    END

    INSERT INTO CommissionRefundRequests (OrderId, ReturnRequestId, SellerId, CommissionAmount, SellerNote)
    VALUES (@OrderId, @ReturnRequestId, @SellerId, @CommissionAmount, @SellerNote);

    SELECT RequestId, OrderId, SellerId, CommissionAmount, Status, SellerNote, CreatedAt
    FROM CommissionRefundRequests
    WHERE OrderId = @OrderId AND SellerId = @SellerId;
END;
GO
