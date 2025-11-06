USE Marketplace
GO
CREATE OR ALTER PROCEDURE AddShippingDetail
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
    @IsDefault BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- If new address is marked as default, unset existing defaults for this user
    IF @IsDefault = 1
    BEGIN
        UPDATE ShippingDetails
        SET IsDefault = 0
        WHERE UserId = @UserId;
    END;

    INSERT INTO ShippingDetails (
        ShippingId, UserId, FullName, PhoneNumber,
        AddressLine1, AddressLine2, City, StateOrProvince,
        PostalCode, Country, CreatedAt, IsDefault
    )
    VALUES (
        @ShippingId, @UserId, @FullName, @PhoneNumber,
        @AddressLine1, @AddressLine2, @City, @StateOrProvince,
        @PostalCode, @Country, GETDATE(), @IsDefault
    );
END;
GO
