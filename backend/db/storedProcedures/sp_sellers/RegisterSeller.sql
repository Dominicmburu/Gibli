USE Marketplace
GO
CREATE OR ALTER PROCEDURE RegisterSeller
    @UserId VARCHAR(50),
    @BusinessNumber NVARCHAR(20),
    @BusinessName NVARCHAR(255),
    @Country VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if the user exists and is currently a buyer
    IF NOT EXISTS (
        SELECT 1 FROM Users
        WHERE UserId = @UserId AND Role = 'Buyer'
    )
    BEGIN
        RAISERROR('User does not exist or is not eligible to become a seller.', 16, 1);
        RETURN;
    END

    -- Check if the business number is already used
    IF EXISTS (
        SELECT 1 FROM Sellers
        WHERE BusinessNumber = @BusinessNumber
    )
    BEGIN
        RAISERROR('Business Number already registered.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Insert seller details
        INSERT INTO Sellers (UserId, BusinessNumber, BusinessName, Country)
        VALUES (@UserId, @BusinessNumber, @BusinessName, @Country);

        -- Update the user's role to Seller
        UPDATE Users
        SET Role = 'Seller'
        WHERE UserId = @UserId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000), @ErrSeverity INT;
        SELECT @ErrMsg = ERROR_MESSAGE(), @ErrSeverity = ERROR_SEVERITY();
        RAISERROR(@ErrMsg, @ErrSeverity, 1);
    END CATCH
END


