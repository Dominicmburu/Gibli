USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetCategoryById(@CategoryId VARCHAR(50))
AS
BEGIN
    SELECT * FROM Categories WHERE CategoryId = @CategoryId
END