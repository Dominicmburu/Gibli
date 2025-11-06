USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteShippingDetail
    @ShippingId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM ShippingDetails
    WHERE ShippingId = @ShippingId;
END;
GO
