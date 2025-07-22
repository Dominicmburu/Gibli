USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserId, Username, Email, PasswordHash, Role, CreatedAt, UpdatedAt
    FROM Users
    -- WHERE Email = @Email AND IsDeleted = 0;
    WHERE Email = @Email;
END;
