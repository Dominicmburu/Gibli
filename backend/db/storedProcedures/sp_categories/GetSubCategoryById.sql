USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetSubCategoryById(@SubCategoryId VARCHAR(50))
AS
BEGIN
    SELECT * FROM SubCategories WHERE SubCategoryId = @SubCategoryId
END