USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetShippingDetailById
    @ShippingId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM ShippingDetails
    WHERE ShippingId = @ShippingId;
END;
GO
