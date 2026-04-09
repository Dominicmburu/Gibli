USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetMessages
    @ConversationId     UNIQUEIDENTIFIER,
    @UserId             VARCHAR(50),
    @Offset             INT = 0,
    @Limit              INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- Verify user belongs to this conversation
    IF NOT EXISTS (
        SELECT 1 FROM Conversations
        WHERE ConversationId = @ConversationId
          AND (BuyerId = @UserId OR SellerId = @UserId)
    )
    BEGIN
        RAISERROR('Conversation not found.', 16, 1);
        RETURN;
    END

    SELECT
        m.MessageId,
        m.ConversationId,
        m.SenderId,
        u.Username AS SenderName,
        m.Content,
        m.MediaUrls,
        m.SentAt,
        m.IsRead
    FROM Messages m
    INNER JOIN Users u ON m.SenderId = u.UserId
    WHERE m.ConversationId = @ConversationId
    ORDER BY m.SentAt ASC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO
