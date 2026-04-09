USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetReviewProductSeller
    @ReviewId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 p.UserId AS ProductSellerId
    FROM Reviews r
    INNER JOIN Products p ON p.ProductId = r.ProductId
    WHERE r.ReviewId = @ReviewId;
END;
GO
