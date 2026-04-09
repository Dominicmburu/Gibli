USE Marketplace;
GO

-- -------------------------------------------------------
-- Step 1: SellerPayouts — track funds owed to sellers
-- -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SellerPayouts')
BEGIN
    CREATE TABLE SellerPayouts (
        PayoutId        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        OrderId         VARCHAR(50)      NOT NULL,
        SellerId        VARCHAR(50)      NOT NULL,
        Amount          DECIMAL(10,2)    NOT NULL,
        Status          NVARCHAR(20)     NOT NULL DEFAULT 'Pending',  -- Pending | Paid
        CreatedAt       DATETIME         NOT NULL DEFAULT GETDATE(),
        PaidAt          DATETIME         NULL,
        AdminNote       NVARCHAR(500)    NULL,
        CONSTRAINT UQ_SellerPayouts_Order UNIQUE (OrderId)
    );
    PRINT 'Created table SellerPayouts';
END
ELSE
    PRINT 'SellerPayouts already exists';
GO

-- -------------------------------------------------------
-- Step 2: CommissionRefundRequests — seller requests commission back on return
-- -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CommissionRefundRequests')
BEGIN
    CREATE TABLE CommissionRefundRequests (
        RequestId           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        OrderId             VARCHAR(50)     NOT NULL,
        ReturnRequestId     UNIQUEIDENTIFIER NULL,
        SellerId            VARCHAR(50)     NOT NULL,
        CommissionAmount    DECIMAL(10,2)   NOT NULL DEFAULT 0,
        Status              NVARCHAR(20)    NOT NULL DEFAULT 'Pending', -- Pending | Approved | Rejected
        SellerNote          NVARCHAR(500)   NULL,
        AdminNote           NVARCHAR(500)   NULL,
        CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
        ResolvedAt          DATETIME        NULL
    );
    PRINT 'Created table CommissionRefundRequests';
END
ELSE
    PRINT 'CommissionRefundRequests already exists';
GO

PRINT 'Migration complete.';
PRINT 'Now run the stored procedure scripts:';
PRINT '  - sp_orders/CreateSellerPayout.sql';
PRINT '  - sp_orders/GetSellerPayouts.sql';
PRINT '  - sp_orders/GetCommissionRefundRequests.sql';
PRINT '  - sp_orders/UpsertCommissionRefundRequest.sql';
GO
