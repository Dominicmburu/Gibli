USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetDefaultShipping
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 
        ShippingId,
        UserId,
        FullName,
        PhoneNumber,
        AddressLine1,
        AddressLine2,
        City,
        StateOrProvince,
        PostalCode,
        Country,
        CreatedAt,
        IsDefault
    FROM ShippingDetails
    WHERE UserId = @UserId
      AND IsDefault = 1;
END;
GO

EXEC GetDefaultShipping '44ed8a2f-10ed-4fe7-888f-c4809da023c1'