USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetUserById
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM Users
    WHERE UserId = @UserId AND IsDeleted = 0;
END;
