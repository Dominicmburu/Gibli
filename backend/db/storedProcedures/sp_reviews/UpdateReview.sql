USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateReview
    @ReviewId VARCHAR(50),
    @Rating   INT,
    @Comment  NVARCHAR(MAX),
    @OrderId  VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Reviews
    SET Rating    = @Rating,
        Comment   = @Comment,
        UpdatedAt = GETDATE(),
        OrderId   = ISNULL(@OrderId, OrderId)
    WHERE ReviewId = @ReviewId;
END;
GO
