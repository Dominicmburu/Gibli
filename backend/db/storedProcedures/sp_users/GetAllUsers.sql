USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetAllUsers
AS
BEGIN
    SET NOCOUNT ON;

    -- SELECT UserId, Username, Email, Role, CreatedAt, UpdatedAt
    SELECT *
    FROM Users
    -- WHERE IsDeleted = 0;
END;

SELECT *
    FROM Sellers