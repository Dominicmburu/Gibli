USE Marketplace;
GO

CREATE OR ALTER PROCEDURE SendMessage
    @MessageId      UNIQUEIDENTIFIER,
    @ConversationId UNIQUEIDENTIFIER,
    @SenderId       VARCHAR(50),
    @Content        NVARCHAR(MAX)   NULL,
    @MediaUrls      NVARCHAR(MAX)   NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verify sender belongs to conversation
    IF NOT EXISTS (
        SELECT 1 FROM Conversations
        WHERE ConversationId = @ConversationId
          AND (BuyerId = @SenderId OR SellerId = @SenderId)
    )
    BEGIN
        RAISERROR('Not authorized to send in this conversation.', 16, 1);
        RETURN;
    END

    INSERT INTO Messages (MessageId, ConversationId, SenderId, Content, MediaUrls, SentAt, IsRead)
    VALUES (@MessageId, @ConversationId, @SenderId, @Content, @MediaUrls, GETDATE(), 0);

    -- Update conversation last message timestamp
    UPDATE Conversations
    SET LastMessageAt = GETDATE()
    WHERE ConversationId = @ConversationId;

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
    WHERE m.MessageId = @MessageId;
END;
GO
