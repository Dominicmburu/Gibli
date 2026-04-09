USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetOrCreateConversation
    @BuyerId        VARCHAR(50),
    @SellerId       VARCHAR(50),
    @ContextType    NVARCHAR(20),
    @ContextId      NVARCHAR(100),
    @ContextData    NVARCHAR(MAX)  NULL
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
        SET @ConversationId = NEWID();
        INSERT INTO Conversations (ConversationId, BuyerId, SellerId, ContextType, ContextId, ContextData)
        VALUES (@ConversationId, @BuyerId, @SellerId, @ContextType, @ContextId, @ContextData);
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
        bu.Username AS BuyerName,
        s.BusinessName AS SellerName
    FROM Conversations c
    INNER JOIN Users bu ON c.BuyerId = bu.UserId
    INNER JOIN Sellers s ON c.SellerId = s.UserId
    WHERE c.ConversationId = @ConversationId;
END;
GO
