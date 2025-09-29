USE Marketplace
GO
CREATE OR ALTER PROCEDURE InsertIntoResetRequest
@ResetId VARCHAR(50),
@UserId VARCHAR(50),
@TokenHash NVARCHAR(512)

AS
BEGIN
INSERT INTO PasswordResetRequests(ResetId, UserId, TokenHash)
VALUES(@ResetId, @UserId, @TokenHash)
END

SELECT * FROM PasswordResetRequests
DELETE  FROM PasswordResetRequests
DROP TABLE PasswordResetRequests