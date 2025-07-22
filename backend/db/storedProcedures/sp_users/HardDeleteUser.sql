USE Marketplace
GO
CREATE OR ALTER PROCEDURE HardDeleteUser
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Users
    WHERE UserId = @UserId;
END;
