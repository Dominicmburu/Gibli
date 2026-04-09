USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CompleteUserOnboarding
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET HasSelectedRole = 1
    WHERE UserId = @UserId;
END;
GO
