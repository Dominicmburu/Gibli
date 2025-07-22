USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetAllUsers
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserId, Username, Email, Role, CreatedAt, UpdatedAt
    FROM Users
    -- WHERE IsDeleted = 0;
END;

EXEC GetAllUsers