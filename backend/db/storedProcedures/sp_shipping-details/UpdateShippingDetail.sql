USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateShippingDetail
    @ShippingId VARCHAR(50),
    @UserId VARCHAR(50),
    @FullName NVARCHAR(255),
    @PhoneNumber VARCHAR(20),
    @AddressLine1 NVARCHAR(255),
    @AddressLine2 NVARCHAR(255) = NULL,
    @City NVARCHAR(100),
    @StateOrProvince NVARCHAR(100) = NULL,
    @PostalCode VARCHAR(20) = NULL,
    @Country VARCHAR(50),
    @IsDefault BIT
AS
BEGIN
    SET NOCOUNT ON;

    -- ✅ Ensure the record belongs to the authenticated user
    IF NOT EXISTS (SELECT 1 FROM ShippingDetails WHERE ShippingId = @ShippingId AND UserId = @UserId)
    BEGIN
        RAISERROR('Unauthorized update or record not found.', 16, 1);
        RETURN;
    END;

    -- ✅ Update only editable fields
    UPDATE ShippingDetails
    SET 
        FullName = @FullName,
        PhoneNumber = @PhoneNumber,
        AddressLine1 = @AddressLine1,
        AddressLine2 = @AddressLine2,
        City = @City,
        StateOrProvince = @StateOrProvince,
        PostalCode = @PostalCode,
        Country = @Country,
        IsDefault = @IsDefault
    WHERE ShippingId = @ShippingId AND UserId = @UserId;
END;
GO
