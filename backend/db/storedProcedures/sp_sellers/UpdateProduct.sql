USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateProduct(
    @ProductId VARCHAR(50),
    @ProductName NVARCHAR(50),
    @CategoryId  VARCHAR(50),
    @Price DECIMAL(10, 2),
    @Description NVARCHAR(MAX),
    @InStock INT)

    AS
    BEGIN
        UPDATE Products
        SET ProductName=@ProductName, CategoryId=@CategoryId, Price=@Price, Description=@Description, InStock=@InStock
        WHERE ProductId=@ProductId
    END