USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateVerificationToken
    @Email NVARCHAR(255),
    @VerificationToken NVARCHAR(255)
AS
BEGIN
    UPDATE Users
    SET VerificationToken = @VerificationToken
    WHERE Email = @Email;
END
