USE Marketplace
GO
CREATE OR ALTER PROCEDURE ClearUsersResetRequests
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM PasswordResetRequests
    WHERE UserId = @UserId;
END
GO
