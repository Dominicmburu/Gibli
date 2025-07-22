USE Marketplace
GO
CREATE PROCEDURE GetUsersByRole
    @Role VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserId, Username, Email, CreatedAt, UpdatedAt
    FROM Users
    WHERE Role = @Role AND IsDeleted = 0;
END;
