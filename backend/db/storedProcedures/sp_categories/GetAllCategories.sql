USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetAllCategories
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM Categories
END;
