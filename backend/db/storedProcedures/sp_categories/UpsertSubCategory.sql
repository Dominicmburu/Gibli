USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpsertSubCategory
    @SubCategoryId VARCHAR(50),
    @CategoryId VARCHAR(50),
    @SubCategoryName VARCHAR(50)

AS
BEGIN
IF EXISTS (SELECT 1 FROM SubCategories WHERE SubCategoryId = @SubCategoryId)
BEGIN
    UPDATE SubCategories
    SET
        
        SubCategoryName = @SubCategoryName
    WHERE SubCategoryId = @SubCategoryId
END
ELSE
BEGIN
    INSERT INTO SubCategories (SubCategoryId, CategoryId, SubCategoryName)
    VALUES (@SubCategoryId, @CategoryId, @SubCategoryName)
END
END

