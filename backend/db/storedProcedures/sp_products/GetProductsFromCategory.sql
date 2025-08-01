USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsFromCategory(
    @CategoryId VARCHAR(50)
)
AS
BEGIN
    SELECT * FROM Products WHERE CategoryId=@CategoryId
END

