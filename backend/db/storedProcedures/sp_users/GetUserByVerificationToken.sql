USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetUserByVerificationToken
    @VerificationToken NVARCHAR(255)
AS
BEGIN
    SELECT * FROM Users WHERE VerificationToken = @VerificationToken;
END
