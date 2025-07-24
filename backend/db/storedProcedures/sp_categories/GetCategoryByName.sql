USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetCategoryByName(@CategoryName VARCHAR(50))
AS
BEGIN
    SELECT * FROM Categories WHERE CategoryName = @CategoryName
END