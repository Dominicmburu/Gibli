USE Marketplace;
GO

CREATE OR ALTER PROCEDURE MarkMessagesRead
    @ConversationId UNIQUEIDENTIFIER,
    @UserId         VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Messages
    SET IsRead = 1
    WHERE ConversationId = @ConversationId
      AND SenderId != @UserId
      AND IsRead = 0;
END;
GO
