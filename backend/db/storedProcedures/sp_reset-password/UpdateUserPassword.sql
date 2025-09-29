USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateUserPassword
    @UserId VARCHAR(50),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET PasswordHash = @PasswordHash,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId

END
GO
