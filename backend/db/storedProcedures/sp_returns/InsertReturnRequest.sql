USE Marketplace;
GO

CREATE OR ALTER PROCEDURE InsertReturnRequest
    @ReturnRequestId VARCHAR(50),
    @OrderId VARCHAR(50),
    @BuyerId VARCHAR(50),
    @Reason NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OrderReturnRequests (
        ReturnRequestId, OrderId, BuyerId, Reason, Status, CreatedAt
    ) VALUES (
        @ReturnRequestId, @OrderId, @BuyerId, @Reason, 'Pending', GETDATE()
    );
END;
GO
