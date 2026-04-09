USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetConversations
    @UserId     VARCHAR(50),
    @Role       NVARCHAR(10)  -- 'Buyer' | 'Seller'
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
        bu.Username AS BuyerName,
        s.BusinessName AS SellerName,
        -- Last message preview
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
        -- Unread count for the current user
        (
            SELECT COUNT(*)
            FROM Messages m
            WHERE m.ConversationId = c.ConversationId
              AND m.SenderId != @UserId
              AND m.IsRead = 0
        ) AS UnreadCount
    FROM Conversations c
    INNER JOIN Users bu ON c.BuyerId = bu.UserId
    INNER JOIN Sellers s ON c.SellerId = s.UserId
    WHERE
        (@Role = 'Buyer'  AND c.BuyerId  = @UserId) OR
        (@Role = 'Seller' AND c.SellerId = @UserId)
    ORDER BY ISNULL(c.LastMessageAt, c.CreatedAt) DESC;
END;
GO
