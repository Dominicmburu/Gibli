USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateOrderRejectionReason
    @OrderId VARCHAR(50),
    @RejectionReason NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Orders
    SET RejectionReason = @RejectionReason
    WHERE OrderId = @OrderId;
END;
GO
