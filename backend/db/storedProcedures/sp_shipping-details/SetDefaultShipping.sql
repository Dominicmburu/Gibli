USE Marketplace
GO
CREATE OR ALTER PROCEDURE SetDefaultShipping
    @UserId VARCHAR(50),
    @ShippingId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Validate that the ShippingId belongs to the User
    IF NOT EXISTS (
        SELECT 1
        FROM ShippingDetails
        WHERE ShippingId = @ShippingId AND UserId = @UserId
    )
    BEGIN
        RAISERROR('Invalid ShippingId or ShippingId does not belong to this user.', 16, 1);
        RETURN;
    END;

    BEGIN TRANSACTION;

    BEGIN TRY
        -- Step 2: Unset all other defaults for the same user
        UPDATE ShippingDetails
        SET IsDefault = 0
        WHERE UserId = @UserId;

        -- Step 3: Set the given address as default
        UPDATE ShippingDetails
        SET IsDefault = 1
        WHERE ShippingId = @ShippingId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
