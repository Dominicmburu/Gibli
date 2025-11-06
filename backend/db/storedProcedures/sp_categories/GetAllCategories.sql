USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetAllCategories
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM Categories
    ORDER BY CategoryName ASC;  -- Sort categories alphabetically (A → Z)
END;
GO
