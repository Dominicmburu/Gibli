USE Marketplace;
GO

CREATE OR ALTER PROCEDURE ToggleNeedsRestock
    @ProductId VARCHAR(50),
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Verify the product belongs to this seller
    IF NOT EXISTS (SELECT 1 FROM Products WHERE ProductId = @ProductId AND UserId = @UserId)
    BEGIN
        RAISERROR('Product not found or you do not own this product.', 16, 1);
        RETURN;
    END

    -- Toggle the flag
    UPDATE Products
    SET NeedsRestock = CASE WHEN NeedsRestock = 1 THEN 0 ELSE 1 END,
        UpdatedAt = GETDATE()
    WHERE ProductId = @ProductId AND UserId = @UserId;

    -- Return updated product
    SELECT ProductId, ProductName, NeedsRestock, InStock
    FROM Products
    WHERE ProductId = @ProductId;
END;
GO
