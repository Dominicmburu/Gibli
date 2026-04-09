USE Marketplace;
GO

-- -------------------------------------------------------
-- Step 1: Conversations — one per buyer+seller+context
-- -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Conversations')
BEGIN
    CREATE TABLE Conversations (
        ConversationId  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        BuyerId         VARCHAR(50)      NOT NULL,
        SellerId        VARCHAR(50)      NOT NULL,
        ContextType     NVARCHAR(20)     NOT NULL,  -- 'product' | 'order'
        ContextId       NVARCHAR(100)    NOT NULL,  -- ProductId or OrderId
        ContextData     NVARCHAR(MAX)    NULL,       -- JSON snapshot: {name, image, price} or {orderId, total, date}
        CreatedAt       DATETIME         NOT NULL DEFAULT GETDATE(),
        LastMessageAt   DATETIME         NULL,
        CONSTRAINT UQ_Conversation UNIQUE (BuyerId, SellerId, ContextType, ContextId)
    );
    PRINT 'Created table Conversations';
END
ELSE
    PRINT 'Conversations already exists';
GO

-- -------------------------------------------------------
-- Step 2: Messages
-- -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Messages')
BEGIN
    CREATE TABLE Messages (
        MessageId       UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ConversationId  UNIQUEIDENTIFIER NOT NULL,
        SenderId        VARCHAR(50)      NOT NULL,
        Content         NVARCHAR(MAX)    NULL,
        MediaUrls       NVARCHAR(MAX)    NULL,   -- JSON array of {url, type}
        SentAt          DATETIME         NOT NULL DEFAULT GETDATE(),
        IsRead          BIT              NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_Messages_ConversationId ON Messages(ConversationId);
    PRINT 'Created table Messages';
END
ELSE
    PRINT 'Messages already exists';
GO

PRINT 'Chat migration complete.';
PRINT 'Now run the stored procedure scripts:';
PRINT '  - sp_chat/GetOrCreateConversation.sql';
PRINT '  - sp_chat/GetConversations.sql';
PRINT '  - sp_chat/GetMessages.sql';
PRINT '  - sp_chat/SendMessage.sql';
PRINT '  - sp_chat/GetUnreadMessageCount.sql';
PRINT '  - sp_chat/MarkMessagesRead.sql';
GO
