USE Marketplace;
GO

CREATE OR ALTER PROCEDURE MarkExchangeShipped
    @ReturnRequestId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET ExchangeShippedAt = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId
      AND ExchangeShippedAt IS NULL;
END;
GO
