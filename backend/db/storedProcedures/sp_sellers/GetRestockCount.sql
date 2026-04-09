USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetRestockCount
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS RestockCount
    FROM Products
    WHERE UserId = @UserId AND NeedsRestock = 1;
END;
GO
