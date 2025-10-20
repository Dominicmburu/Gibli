USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetSubCategories
    @CategoryId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM SubCategories
    WHERE CategoryId = @CategoryId
END;