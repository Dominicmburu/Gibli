USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateExchangeTracking
    @ReturnRequestId     VARCHAR(50),
    @ExchangeTrackingNumber NVARCHAR(200),
    @ExchangeTrackingUrl    NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET ExchangeTrackingNumber = @ExchangeTrackingNumber,
        ExchangeTrackingUrl    = @ExchangeTrackingUrl
    WHERE ReturnRequestId = @ReturnRequestId;
END;
GO
