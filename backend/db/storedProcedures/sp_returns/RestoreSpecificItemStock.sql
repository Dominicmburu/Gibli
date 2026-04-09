USE Marketplace;
GO

-- Restores stock for a single returned product by quantity.
-- Used for partial returns where only specific items were returned.
CREATE OR ALTER PROCEDURE RestoreSpecificItemStock
    @ProductId VARCHAR(50),
    @Quantity  INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Products
    SET InStock   = InStock + @Quantity,
        UpdatedAt = GETDATE()
    WHERE ProductId = @ProductId;
END;
GO


