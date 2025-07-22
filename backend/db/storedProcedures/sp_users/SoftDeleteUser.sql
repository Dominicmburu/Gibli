USE Marketplace
GO 
CREATE OR ALTER PROCEDURE SoftDeleteUser
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET IsDeleted = 1,
        UpdatedAt = GETDATE()
    WHERE UserId = @UserId AND IsDeleted = 0;
END;
