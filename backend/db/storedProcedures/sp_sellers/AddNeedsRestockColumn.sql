USE Marketplace;
GO

-- Add NeedsRestock column to Products table if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'NeedsRestock'
)
BEGIN
    ALTER TABLE Products ADD NeedsRestock BIT NOT NULL DEFAULT 0;
END
GO
