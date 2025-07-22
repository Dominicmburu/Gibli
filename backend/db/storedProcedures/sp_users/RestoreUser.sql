USE Marketplace
GO 
CREATE PROCEDURE RestoreUser
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET IsDeleted = 0,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND IsDeleted = 1;
END;
