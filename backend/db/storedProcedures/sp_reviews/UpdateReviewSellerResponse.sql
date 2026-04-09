USE Marketplace;
GO

CREATE OR ALTER PROCEDURE UpdateReviewSellerResponse
    @ReviewId       VARCHAR(50),
    @SellerResponse NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Reviews
    SET SellerResponse   = @SellerResponse,
        SellerResponseAt = GETDATE(),
        UpdatedAt        = GETDATE()
    WHERE ReviewId = @ReviewId;
END;
GO
