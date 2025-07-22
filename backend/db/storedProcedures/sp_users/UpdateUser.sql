USE Marketplace
GO 
CREATE OR ALTER PROCEDURE UpdateUser
    @UserId VARCHAR(50),
    @Username NVARCHAR(50),
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET 
        Username = @Username,
        Email = @Email,
        PasswordHash = @PasswordHash,
        Role = @Role,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND IsDeleted = 0;
END;
