USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetRequestsByUserId
@UserId VARCHAR(50)
AS
BEGIN
SELECT * FROM PasswordResetRequests WHERE UserId=@UserId 
END

SELECT * FROM PasswordResetRequests
