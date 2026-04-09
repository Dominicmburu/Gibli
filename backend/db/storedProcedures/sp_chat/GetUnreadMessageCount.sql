USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetUnreadMessageCount
    @UserId     VARCHAR(50),
    @Role       NVARCHAR(10)  -- 'Buyer' | 'Seller'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS UnreadCount
    FROM Messages m
    INNER JOIN Conversations c ON m.ConversationId = c.ConversationId
    WHERE
        m.SenderId != @UserId
        AND m.IsRead = 0
        AND (
            (@Role = 'Buyer'  AND c.BuyerId  = @UserId) OR
            (@Role = 'Seller' AND c.SellerId = @UserId)
        );
END;
GO
