USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteSubCategory
    @SubCategoryId VARCHAR(50)
AS
BEGIN
    DELETE FROM SubCategories WHERE SubCategoryId = @SubCategoryId
END