USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateBuyerTracking
    @ReturnRequestId  VARCHAR(50),
    @BuyerTrackingNumber NVARCHAR(255),
    @BuyerTrackingUrl    NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET BuyerTrackingNumber = @BuyerTrackingNumber,
        BuyerTrackingUrl    = @BuyerTrackingUrl,
        BuyerShippedAt      = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId;
END;
GO
