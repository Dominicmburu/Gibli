USE Marketplace;
GO

CREATE OR ALTER PROCEDURE InsertReview
    @ReviewId   VARCHAR(50),
    @ProductId  VARCHAR(50),
    @UserId     VARCHAR(50),
    @Rating     INT,
    @Comment    NVARCHAR(MAX),
    @OrderId    VARCHAR(50),
    @OrderItemId VARCHAR(50),
    @SellerId   VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Reviews (
        ReviewId, ProductId, UserId, Rating, Comment,
        CreatedAt, UpdatedAt, OrderId, OrderItemId, SellerId
    ) VALUES (
        @ReviewId, @ProductId, @UserId, @Rating, @Comment,
        GETDATE(), GETDATE(), @OrderId, @OrderItemId, @SellerId
    );
END;
GO
