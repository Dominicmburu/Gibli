USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetReturnMedia
    @ReturnRequestId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT MediaId, MediaUrl, MediaType, CreatedAt
    FROM OrderReturnMedia
    WHERE ReturnRequestId = @ReturnRequestId
    ORDER BY CreatedAt;
END;
GO
