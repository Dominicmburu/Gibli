USE Marketplace
GO

-- Add LowStockThreshold column to Products table
-- Each seller can define what "low stock" means per product
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Products') AND name = 'LowStockThreshold'
)
BEGIN
    ALTER TABLE Products ADD LowStockThreshold INT NOT NULL DEFAULT 5;
    PRINT 'Added LowStockThreshold column with default value of 5';
END
ELSE
BEGIN
    PRINT 'LowStockThreshold column already exists';
END
GO
