USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteProduct(@ProductId VARCHAR(50))
AS
BEGIN
SET NOCOUNT ON;
    DELETE FROM Products WHERE ProductId = @ProductId
END



