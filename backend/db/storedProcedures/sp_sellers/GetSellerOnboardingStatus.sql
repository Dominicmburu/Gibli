USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetSellerOnboardingStatus
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT HasCompletedOnboarding
    FROM Sellers
    WHERE UserId = @UserId;
END;
GO
