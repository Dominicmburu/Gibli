USE Marketplace
GO

CREATE OR ALTER PROCEDURE EnsureOtherSubCategory
    @CategoryId VARCHAR(50),
    @SubCategoryId VARCHAR(50)
AS
BEGIN
    -- Check if "Other" exists for this category
    IF NOT EXISTS (
        SELECT 1 
        FROM SubCategories
        WHERE CategoryId = @CategoryId
          AND SubCategoryName = 'Other'
    )
    BEGIN
        INSERT INTO SubCategories (SubCategoryId, CategoryId, SubCategoryName)
        VALUES (@SubCategoryId, @CategoryId, 'Other')
    END
END
