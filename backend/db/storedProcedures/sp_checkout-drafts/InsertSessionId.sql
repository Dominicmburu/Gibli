USE Marketplace
GO
CREATE OR ALTER PROCEDURE InsertSessionIdToDraft
    @DraftId VARCHAR(50),
    @SessionId NVARCHAR(255)
AS
BEGIN
    UPDATE CheckoutDrafts
    SET SessionId = @SessionId
    WHERE DraftId = @DraftId;
END;
