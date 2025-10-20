USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpsertCategory(
    @CategoryId VARCHAR(50),
    @CategoryName VARCHAR(50)
    -- @Description VARCHAR(MAX)
    )

    AS
    BEGIN
    IF EXISTS (SELECT 1 FROM Categories WHERE CategoryId=@CategoryId)
    BEGIN
        UPDATE Categories
        SET CategoryName=@CategoryName
        WHERE CategoryId=@CategoryId
    END
    ELSE
    BEGIN
        INSERT INTO Categories (CategoryId, CategoryName)
        VALUES (@CategoryId, @CategoryName)
    END
    END


