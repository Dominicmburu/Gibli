USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CompleteSellerOnboarding
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Sellers
    SET HasCompletedOnboarding = 1
    WHERE UserId = @UserId;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO
