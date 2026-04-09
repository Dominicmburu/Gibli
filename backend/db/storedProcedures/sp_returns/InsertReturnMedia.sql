USE Marketplace;
GO

CREATE OR ALTER PROCEDURE InsertReturnMedia
    @MediaId VARCHAR(50),
    @ReturnRequestId VARCHAR(50),
    @MediaUrl NVARCHAR(MAX),
    @MediaType NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OrderReturnMedia (MediaId, ReturnRequestId, MediaUrl, MediaType, CreatedAt)
    VALUES (@MediaId, @ReturnRequestId, @MediaUrl, @MediaType, GETDATE());
END;
GO
