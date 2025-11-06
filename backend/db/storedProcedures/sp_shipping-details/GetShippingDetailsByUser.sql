USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetShippingDetailsByUser
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM ShippingDetails
    WHERE UserId = @UserId
    ORDER BY CreatedAt DESC;
END;
GO
