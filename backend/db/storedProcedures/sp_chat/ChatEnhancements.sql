USE Marketplace;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Schema additions
-- ─────────────────────────────────────────────────────────────────────────────

-- Status column on Conversations ('active' | 'closed')
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Conversations') AND name = 'Status')
    ALTER TABLE Conversations ADD Status NVARCHAR(10) NOT NULL DEFAULT 'active';
GO

-- Soft-delete timestamps per user
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Conversations') AND name = 'DeletedByBuyerAt')
    ALTER TABLE Conversations ADD DeletedByBuyerAt DATETIME NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Conversations') AND name = 'DeletedBySellerAt')
    ALTER TABLE Conversations ADD DeletedBySellerAt DATETIME NULL;
GO

-- BlockedUsers table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BlockedUsers')
BEGIN
    CREATE TABLE BlockedUsers (
        BlockId   UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        BlockerId VARCHAR(50)      NOT NULL,
        BlockedId VARCHAR(50)      NOT NULL,
        CreatedAt DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Block UNIQUE (BlockerId, BlockedId)
    );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Updated existing SPs
-- ─────────────────────────────────────────────────────────────────────────────

-- GetConversations: exclude conversations deleted by the requesting user; include Status
CREATE OR ALTER PROCEDURE GetConversations
    @UserId VARCHAR(50),
    @Role   NVARCHAR(10)  -- 'Buyer' | 'Seller'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.ConversationId,
        c.BuyerId,
        c.SellerId,
        c.ContextType,
        c.ContextId,
        c.ContextData,
        c.CreatedAt,
        c.LastMessageAt,
        c.Status,
        bu.Username    AS BuyerName,
        s.BusinessName AS SellerName,
        (
            SELECT TOP 1 m.Content
            FROM Messages m
            WHERE m.ConversationId = c.ConversationId
            ORDER BY m.SentAt DESC
        ) AS LastMessageContent,
        (
            SELECT TOP 1 m.SentAt
            FROM Messages m
            WHERE m.ConversationId = c.ConversationId
            ORDER BY m.SentAt DESC
        ) AS LastMessageSentAt,
        (
            SELECT COUNT(*)
            FROM Messages m
            WHERE m.ConversationId = c.ConversationId
              AND m.SenderId != @UserId
              AND m.IsRead = 0
        ) AS UnreadCount
    FROM Conversations c
    INNER JOIN Users   bu ON c.BuyerId  = bu.UserId
    INNER JOIN Sellers s  ON c.SellerId = s.UserId
    WHERE
        (@Role = 'Buyer'  AND c.BuyerId  = @UserId AND c.DeletedByBuyerAt  IS NULL) OR
        (@Role = 'Seller' AND c.SellerId = @UserId AND c.DeletedBySellerAt IS NULL)
    ORDER BY ISNULL(c.LastMessageAt, c.CreatedAt) DESC;
END;
GO

-- GetOrCreateConversation: block-check on new conversations; reopen soft-deleted; return Status
CREATE OR ALTER PROCEDURE GetOrCreateConversation
    @BuyerId     VARCHAR(50),
    @SellerId    VARCHAR(50),
    @ContextType NVARCHAR(20),
    @ContextId   NVARCHAR(100),
    @ContextData NVARCHAR(MAX) NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ConversationId UNIQUEIDENTIFIER;

    SELECT @ConversationId = ConversationId
    FROM Conversations
    WHERE BuyerId = @BuyerId AND SellerId = @SellerId
      AND ContextType = @ContextType AND ContextId = @ContextId;

    IF @ConversationId IS NULL
    BEGIN
        -- Block check only for brand-new conversations
        IF EXISTS (
            SELECT 1 FROM BlockedUsers
            WHERE (BlockerId = @BuyerId  AND BlockedId = @SellerId)
               OR (BlockerId = @SellerId AND BlockedId = @BuyerId)
        )
        BEGIN
            RAISERROR('Cannot start a conversation: one party has blocked the other.', 16, 1);
            RETURN;
        END

        SET @ConversationId = NEWID();
        INSERT INTO Conversations
            (ConversationId, BuyerId, SellerId, ContextType, ContextId, ContextData, Status)
        VALUES
            (@ConversationId, @BuyerId, @SellerId, @ContextType, @ContextId, @ContextData, 'active');
    END
    ELSE
    BEGIN
        -- Reopen the conversation for the buyer if they had soft-deleted it
        UPDATE Conversations
        SET DeletedByBuyerAt = NULL
        WHERE ConversationId = @ConversationId AND DeletedByBuyerAt IS NOT NULL;
    END

    SELECT
        c.ConversationId,
        c.BuyerId,
        c.SellerId,
        c.ContextType,
        c.ContextId,
        c.ContextData,
        c.CreatedAt,
        c.LastMessageAt,
        c.Status,
        bu.Username    AS BuyerName,
        s.BusinessName AS SellerName
    FROM Conversations c
    INNER JOIN Users   bu ON c.BuyerId  = bu.UserId
    INNER JOIN Sellers s  ON c.SellerId = s.UserId
    WHERE c.ConversationId = @ConversationId;
END;
GO

-- SendMessage: block check; reopen closed conversations; clear sender's soft-delete
CREATE OR ALTER PROCEDURE SendMessage
    @MessageId      UNIQUEIDENTIFIER,
    @ConversationId UNIQUEIDENTIFIER,
    @SenderId       VARCHAR(50),
    @Content        NVARCHAR(MAX)   NULL,
    @MediaUrls      NVARCHAR(MAX)   NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BuyerId VARCHAR(50), @SellerId VARCHAR(50);

    SELECT @BuyerId = BuyerId, @SellerId = SellerId
    FROM Conversations
    WHERE ConversationId = @ConversationId;

    -- Verify sender is a participant
    IF @BuyerId IS NULL OR (@SenderId != @BuyerId AND @SenderId != @SellerId)
    BEGIN
        RAISERROR('Not authorized to send in this conversation.', 16, 1);
        RETURN;
    END

    DECLARE @ReceiverId VARCHAR(50) = CASE WHEN @SenderId = @BuyerId THEN @SellerId ELSE @BuyerId END;

    -- Block checks
    IF EXISTS (SELECT 1 FROM BlockedUsers WHERE BlockerId = @ReceiverId AND BlockedId = @SenderId)
    BEGIN
        RAISERROR('You have been blocked by this user.', 16, 1);
        RETURN;
    END
    IF EXISTS (SELECT 1 FROM BlockedUsers WHERE BlockerId = @SenderId AND BlockedId = @ReceiverId)
    BEGIN
        RAISERROR('You have blocked this user. Unblock them to send messages.', 16, 1);
        RETURN;
    END

    -- Reopen conversation if closed; clear sender's soft-delete
    IF @SenderId = @BuyerId
        UPDATE Conversations
        SET Status = 'active', DeletedByBuyerAt = NULL, LastMessageAt = GETDATE()
        WHERE ConversationId = @ConversationId;
    ELSE
        UPDATE Conversations
        SET Status = 'active', DeletedBySellerAt = NULL, LastMessageAt = GETDATE()
        WHERE ConversationId = @ConversationId;

    INSERT INTO Messages (MessageId, ConversationId, SenderId, Content, MediaUrls, SentAt, IsRead)
    VALUES (@MessageId, @ConversationId, @SenderId, @Content, @MediaUrls, GETDATE(), 0);

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. New stored procedures
-- ─────────────────────────────────────────────────────────────────────────────

-- Fetch full conversation info including Status and block state (for chat modal)
CREATE OR ALTER PROCEDURE GetConversationInfo
    @ConversationId UNIQUEIDENTIFIER,
    @UserId         VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM Conversations
        WHERE ConversationId = @ConversationId
          AND (BuyerId = @UserId OR SellerId = @UserId)
    )
    BEGIN
        RAISERROR('Conversation not found or access denied.', 16, 1);
        RETURN;
    END

    DECLARE @OtherId VARCHAR(50);
    SELECT @OtherId = CASE WHEN BuyerId = @UserId THEN SellerId ELSE BuyerId END
    FROM Conversations WHERE ConversationId = @ConversationId;

    SELECT
        c.ConversationId,
        c.BuyerId,
        c.SellerId,
        c.ContextType,
        c.ContextId,
        c.ContextData,
        c.CreatedAt,
        c.LastMessageAt,
        c.Status,
        bu.Username    AS BuyerName,
        s.BusinessName AS SellerName,
        @OtherId       AS OtherUserId,
        CASE WHEN EXISTS (
            SELECT 1 FROM BlockedUsers
            WHERE (BlockerId = @UserId  AND BlockedId = @OtherId)
               OR (BlockerId = @OtherId AND BlockedId = @UserId)
        ) THEN 1 ELSE 0 END AS IsBlocked,
        CASE WHEN EXISTS (
            SELECT 1 FROM BlockedUsers
            WHERE BlockerId = @UserId AND BlockedId = @OtherId
        ) THEN 1 ELSE 0 END AS IBlockedThem
    FROM Conversations c
    INNER JOIN Users   bu ON c.BuyerId  = bu.UserId
    INNER JOIN Sellers s  ON c.SellerId = s.UserId
    WHERE c.ConversationId = @ConversationId;
END;
GO

-- Close a conversation (either participant may close)
CREATE OR ALTER PROCEDURE CloseConversation
    @ConversationId UNIQUEIDENTIFIER,
    @UserId         VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM Conversations
        WHERE ConversationId = @ConversationId
          AND (BuyerId = @UserId OR SellerId = @UserId)
    )
    BEGIN
        RAISERROR('Not authorized to close this conversation.', 16, 1);
        RETURN;
    END
    UPDATE Conversations SET Status = 'closed' WHERE ConversationId = @ConversationId;
    SELECT ConversationId, Status FROM Conversations WHERE ConversationId = @ConversationId;
END;
GO

-- Soft-delete a conversation for one user; physically remove once both have deleted
CREATE OR ALTER PROCEDURE DeleteConversation
    @ConversationId UNIQUEIDENTIFIER,
    @UserId         VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BuyerId VARCHAR(50), @SellerId VARCHAR(50);
    SELECT @BuyerId = BuyerId, @SellerId = SellerId
    FROM Conversations WHERE ConversationId = @ConversationId;

    IF @BuyerId IS NULL
    BEGIN
        RAISERROR('Conversation not found.', 16, 1);
        RETURN;
    END
    IF @UserId != @BuyerId AND @UserId != @SellerId
    BEGIN
        RAISERROR('Not authorized to delete this conversation.', 16, 1);
        RETURN;
    END

    IF @UserId = @BuyerId
        UPDATE Conversations SET DeletedByBuyerAt  = GETDATE() WHERE ConversationId = @ConversationId;
    ELSE
        UPDATE Conversations SET DeletedBySellerAt = GETDATE() WHERE ConversationId = @ConversationId;

    -- Physically remove when both sides have deleted
    IF EXISTS (
        SELECT 1 FROM Conversations
        WHERE ConversationId = @ConversationId
          AND DeletedByBuyerAt IS NOT NULL AND DeletedBySellerAt IS NOT NULL
    )
    BEGIN
        DELETE FROM Messages      WHERE ConversationId = @ConversationId;
        DELETE FROM Conversations WHERE ConversationId = @ConversationId;
    END

    SELECT 1 AS Success;
END;
GO

-- Block a user (idempotent)
CREATE OR ALTER PROCEDURE BlockUser
    @BlockerId VARCHAR(50),
    @BlockedId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM BlockedUsers WHERE BlockerId = @BlockerId AND BlockedId = @BlockedId)
        INSERT INTO BlockedUsers (BlockerId, BlockedId) VALUES (@BlockerId, @BlockedId);
    SELECT 1 AS Success;
END;
GO

-- Unblock a user
CREATE OR ALTER PROCEDURE UnblockUser
    @BlockerId VARCHAR(50),
    @BlockedId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM BlockedUsers WHERE BlockerId = @BlockerId AND BlockedId = @BlockedId;
    SELECT 1 AS Success;
END;
GO

-- Auto-delete conversations with no activity in 29+ days (called by cron)
CREATE OR ALTER PROCEDURE AutoDeleteOldConversations
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Cutoff DATETIME = DATEADD(day, -29, GETDATE());

    DELETE FROM Messages
    WHERE ConversationId IN (
        SELECT ConversationId FROM Conversations
        WHERE ISNULL(LastMessageAt, CreatedAt) < @Cutoff
    );

    DELETE FROM Conversations
    WHERE ISNULL(LastMessageAt, CreatedAt) < @Cutoff;

    SELECT @@ROWCOUNT AS DeletedCount;
END;
GO
