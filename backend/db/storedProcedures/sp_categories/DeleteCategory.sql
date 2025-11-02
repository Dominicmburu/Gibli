USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteCategory
    @CategoryId VARCHAR(50)
AS
BEGIN
    DELETE FROM Categories WHERE CategoryId = @CategoryId
END