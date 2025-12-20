USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteProduct(@ProductId VARCHAR(50))
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Delete associated images first
        DELETE FROM ProductImages WHERE ProductId = @ProductId;
        
        -- Then delete the product
        DELETE FROM Products WHERE ProductId = @ProductId;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END


