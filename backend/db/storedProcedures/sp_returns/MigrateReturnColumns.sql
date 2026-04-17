USE Marketplace;
GO

-- Add PartialRefundAmount
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'PartialRefundAmount'
)
    ALTER TABLE OrderReturnRequests ADD PartialRefundAmount DECIMAL(10,2) NULL;

-- Add ProofUrl / ProofUploadedAt
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ProofUrl'
)
    ALTER TABLE OrderReturnRequests ADD ProofUrl NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ProofUploadedAt'
)
    ALTER TABLE OrderReturnRequests ADD ProofUploadedAt DATETIME NULL;

-- Add exchange shipping fields
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ExchangeTrackingNumber'
)
    ALTER TABLE OrderReturnRequests ADD ExchangeTrackingNumber NVARCHAR(200) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ExchangeTrackingUrl'
)
    ALTER TABLE OrderReturnRequests ADD ExchangeTrackingUrl NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ExchangeShippedAt'
)
    ALTER TABLE OrderReturnRequests ADD ExchangeShippedAt DATETIME NULL;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ExchangeDeliveredAt'
)
    ALTER TABLE OrderReturnRequests ADD ExchangeDeliveredAt DATETIME NULL;

PRINT 'Migration complete. Now run: GetReturnRequestWithOrder, ApproveReturnRequest, MarkReturnProofUploaded, UpdateExchangeTracking, MarkExchangeShipped, MarkExchangeDelivered';
GO
