USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductById(@ProductId VARCHAR(50))
AS
BEGIN
    SELECT * FROM Products WHERE ProductId = @ProductId
END