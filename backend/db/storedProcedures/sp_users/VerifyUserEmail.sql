USE Marketplace
GO
CREATE OR ALTER PROCEDURE VerifyUserEmail
    @UserId VARCHAR(50)
AS
BEGIN
    UPDATE Users
    SET IsEmailVerified = 1,
        VerificationToken = NULL,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId;
END
