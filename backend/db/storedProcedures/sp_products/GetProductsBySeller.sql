USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsBySeller(@UserId VARCHAR(50))
AS
BEGIN
    SELECT * FROM Products WHERE UserId = @UserId
END