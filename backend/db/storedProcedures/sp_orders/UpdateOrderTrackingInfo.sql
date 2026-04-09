USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateOrderTrackingInfo
    @OrderId VARCHAR(50),
    @TrackingNumber NVARCHAR(200),
    @TrackingUrl NVARCHAR(2083)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Orders
    SET TrackingNumber = @TrackingNumber,
        TrackingUrl = @TrackingUrl
    WHERE OrderId = @OrderId;
END;
GO
