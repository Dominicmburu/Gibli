USE Marketplace
GO 
CREATE OR ALTER PROCEDURE CreateUser
    @UserId VARCHAR(50),
    @Username NVARCHAR(50),
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role VARCHAR(20) = 'Buyer'
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Users (UserId, Username, Email, PasswordHash, Role)
    VALUES (@UserId, @Username, @Email, @PasswordHash, @Role);
END;
