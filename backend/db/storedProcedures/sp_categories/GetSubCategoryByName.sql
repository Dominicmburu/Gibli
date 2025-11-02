USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetSubCategoryByName(@SubCategoryName VARCHAR(50))
AS
BEGIN
    SELECT * FROM SubCategories WHERE SubCategoryName = @SubCategoryName
END