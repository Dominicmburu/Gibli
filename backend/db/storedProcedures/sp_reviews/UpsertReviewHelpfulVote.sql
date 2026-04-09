USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpsertReviewHelpfulVote
    @ReviewId  VARCHAR(50),
    @UserId    VARCHAR(50),
    @IsHelpful BIT
AS
BEGIN
    SET NOCOUNT ON;

    MERGE ReviewHelpfulVotes AS target
    USING (SELECT @ReviewId AS ReviewId, @UserId AS UserId) AS source
    ON target.ReviewId = source.ReviewId AND target.UserId = source.UserId
    WHEN MATCHED THEN
        UPDATE SET IsHelpful = @IsHelpful, CreatedAt = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (ReviewId, UserId, IsHelpful, CreatedAt)
        VALUES (@ReviewId, @UserId, @IsHelpful, GETDATE());
END;
GO
