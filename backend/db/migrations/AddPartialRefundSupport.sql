USE Marketplace;
GO

-- Add PartialRefundAmount column to OrderReturnRequests
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'PartialRefundAmount'
)
BEGIN
    ALTER TABLE OrderReturnRequests
    ADD PartialRefundAmount DECIMAL(10,2) NULL;
    PRINT 'Added PartialRefundAmount column to OrderReturnRequests';
END
ELSE
    PRINT 'PartialRefundAmount column already exists';
GO

PRINT 'Migration complete.';
PRINT 'Now run: sp_returns/ProcessPartialRefund.sql';
PRINT 'And re-run: sp_returns/GetLatestReturnRequest.sql, GetReturnRequestWithOrder.sql';
GO
