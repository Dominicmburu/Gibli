USE Marketplace;
GO

-- -------------------------------------------------------
-- Step 1: Add buyer tracking columns to OrderReturnRequests
-- -------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'BuyerTrackingNumber'
)
    ALTER TABLE OrderReturnRequests ADD BuyerTrackingNumber NVARCHAR(255) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'BuyerTrackingUrl'
)
    ALTER TABLE OrderReturnRequests ADD BuyerTrackingUrl NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'BuyerShippedAt'
)
    ALTER TABLE OrderReturnRequests ADD BuyerShippedAt DATETIME NULL;

-- -------------------------------------------------------
-- Step 2: Add ReturnAddress to Sellers
-- -------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Sellers' AND COLUMN_NAME = 'ReturnAddress'
)
    ALTER TABLE Sellers ADD ReturnAddress NVARCHAR(MAX) NULL;

PRINT 'Migration complete. Now re-run the stored procedure scripts:';
PRINT '  - sp_returns/GetReturnRequestWithOrder.sql';
PRINT '  - sp_returns/GetLatestReturnRequest.sql';
PRINT '  - sp_returns/UpdateBuyerTracking.sql';
PRINT '  - sp_sellers/GetSellerStoreInfo.sql';
PRINT '  - sp_sellers/UpdateSellerProfile.sql';
GO
