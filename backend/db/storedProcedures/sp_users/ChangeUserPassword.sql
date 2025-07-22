USE Marketplace
GO
CREATE PROCEDURE ChangeUserPassword
    @UserId VARCHAR(50),
    @NewPasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET PasswordHash = @NewPasswordHash,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND IsDeleted = 0;
END;
