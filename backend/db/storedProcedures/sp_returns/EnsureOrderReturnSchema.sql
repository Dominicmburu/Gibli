USE Marketplace;
GO

CREATE OR ALTER PROCEDURE EnsureOrderReturnSchema
AS
BEGIN
    SET NOCOUNT ON;

    -- Add Orders.DeliveredAt if missing
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'DeliveredAt'
    )
        ALTER TABLE Orders ADD DeliveredAt DATETIME NULL;

    -- Add Orders.RefundStatus if missing
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'RefundStatus'
    )
        ALTER TABLE Orders ADD RefundStatus NVARCHAR(50) NULL;

    -- Backfill DeliveredAt from UpdatedAt for already-delivered orders
    UPDATE o
    SET o.DeliveredAt = o.UpdatedAt
    FROM Orders o
    WHERE o.DeliveredAt IS NULL
      AND o.DeliveryStatus IN ('Delivered', 'Sold')
      AND o.UpdatedAt IS NOT NULL;

    -- Create OrderReturnRequests table if missing
    IF OBJECT_ID('OrderReturnRequests', 'U') IS NULL
    BEGIN
        CREATE TABLE OrderReturnRequests (
            ReturnRequestId VARCHAR(50) NOT NULL PRIMARY KEY,
            OrderId         VARCHAR(50) NOT NULL,
            BuyerId         VARCHAR(50) NOT NULL,
            Reason          NVARCHAR(MAX) NOT NULL,
            Status          NVARCHAR(50) NOT NULL,
            SellerInstructions    NVARCHAR(MAX) NULL,
            SellerRejectionReason NVARCHAR(MAX) NULL,
            CreatedAt       DATETIME NOT NULL DEFAULT GETDATE(),
            ResolvedAt      DATETIME NULL,
            CONSTRAINT FK_OrderReturnRequests_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId)
        );
        CREATE INDEX IX_OrderReturnRequests_OrderId ON OrderReturnRequests(OrderId);
    END

    -- Create OrderReturnMedia table if missing
    IF OBJECT_ID('OrderReturnMedia', 'U') IS NULL
    BEGIN
        CREATE TABLE OrderReturnMedia (
            MediaId         VARCHAR(50) NOT NULL PRIMARY KEY,
            ReturnRequestId VARCHAR(50) NOT NULL,
            MediaUrl        NVARCHAR(MAX) NOT NULL,
            MediaType       NVARCHAR(20) NOT NULL,
            CreatedAt       DATETIME NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_OrderReturnMedia_Request FOREIGN KEY (ReturnRequestId)
                REFERENCES OrderReturnRequests(ReturnRequestId) ON DELETE CASCADE
        );
    END

    -- Add OrderReturnRequests.ResolutionType if missing
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'OrderReturnRequests' AND COLUMN_NAME = 'ResolutionType'
    )
        ALTER TABLE OrderReturnRequests ADD ResolutionType NVARCHAR(50) NULL;

    -- Add buyer tracking fields (physical_return flow)
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

    -- Add per-item status tracking (Phase 2: per-product Sold status)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'OrderItems' AND COLUMN_NAME = 'ItemStatus'
    )
        ALTER TABLE OrderItems ADD ItemStatus NVARCHAR(50) NULL; -- NULL=follow order, 'ReturnPending', 'Sold'

    -- Add ReturnAddress to Sellers table (for approve modal template)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Sellers' AND COLUMN_NAME = 'ReturnAddress'
    )
        ALTER TABLE Sellers ADD ReturnAddress NVARCHAR(MAX) NULL;

    -- Create OrderReturnItems table if missing (tracks which items are included in a return)
    IF OBJECT_ID('OrderReturnItems', 'U') IS NULL
    BEGIN
        CREATE TABLE OrderReturnItems (
            ReturnItemId      VARCHAR(50)      NOT NULL PRIMARY KEY,
            ReturnRequestId   VARCHAR(50)      NOT NULL,
            OrderItemId       VARCHAR(50)      NOT NULL,
            ProductId         VARCHAR(50)      NOT NULL,
            ProductName       NVARCHAR(255)    NOT NULL,
            ProductImageUrl   NVARCHAR(MAX)    NULL,
            ReturnQuantity    INT              NOT NULL DEFAULT 1,
            UnitPrice         DECIMAL(10,2)   NOT NULL,
            CreatedAt         DATETIME         NOT NULL DEFAULT GETDATE(),
            CONSTRAINT FK_OrderReturnItems_Request FOREIGN KEY (ReturnRequestId)
                REFERENCES OrderReturnRequests(ReturnRequestId) ON DELETE CASCADE
        );
    END

    -- Ensure DeliveryStatus CHECK constraint does NOT include return values
    -- (returns are tracked by RefundStatus only — DeliveryStatus stays Delivered)
    DECLARE @ConstraintName NVARCHAR(200);
    DECLARE @ConstraintDef  NVARCHAR(MAX);

    SELECT
        @ConstraintName = dc.name,
        @ConstraintDef  = OBJECT_DEFINITION(dc.object_id)
    FROM sys.check_constraints dc
    INNER JOIN sys.objects tb  ON dc.parent_object_id = tb.object_id
    INNER JOIN sys.columns c   ON tb.object_id = c.object_id AND c.column_id = dc.parent_column_id
    WHERE tb.name = 'Orders' AND c.name = 'DeliveryStatus';

    IF LOWER(ISNULL(@ConstraintDef, '')) LIKE '%returnrequested%'
        OR LOWER(ISNULL(@ConstraintDef, '')) NOT LIKE '%sold%'
    BEGIN
        IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE Orders DROP CONSTRAINT [' + @ConstraintName + ']');

        -- Clean up any rows stuck in the old return delivery statuses
        UPDATE Orders
        SET DeliveryStatus = 'Delivered', UpdatedAt = GETDATE()
        WHERE DeliveryStatus IN ('ReturnRequested', 'ReturnApproved');

        ALTER TABLE Orders ADD CONSTRAINT CK_Orders_DeliveryStatus CHECK (
            DeliveryStatus IN (
                'Processing', 'Confirmed', 'Shipped', 'Delivered',
                'Cancelled', 'Rejected', 'Sold'
            )
        );
    END
END;
GO
