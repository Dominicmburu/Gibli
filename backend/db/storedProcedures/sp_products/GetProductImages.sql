USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductImages(@ProductId VARCHAR(50))
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ImageId, ImageUrl 
    FROM ProductImages 
    WHERE ProductId = @ProductId
END