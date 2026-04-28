-- ============================================================
-- SEPA DEFERRED ORDER STATUS PROCEDURES
--
-- SEPA Direct Debit is asynchronous: Stripe fires
-- checkout.session.completed when the mandate is created, but
-- bank settlement takes 1-3 business days.
--
-- Life-cycle:
--   checkout.session.completed  → fulfillOrder (AwaitingPayment)
--   payment_intent.succeeded    → PromoteAwaitingOrders  → Processing
--   payment_intent.payment_failed → SetPaymentFailedOrders → PaymentFailed
--   Buyer retries payment        → RetryOrderPayment
--   30-day cron (no retry)       → GetExpiredFailedSepaOrders → cleanup
--
-- Run this file once against the target database (Marketplace locally,
-- giblidatabase in production). No USE statement — connect to the correct
-- DB before running. All procedures use CREATE OR ALTER so re-running is safe.
-- ============================================================

-- ─── 1. Promote: bank cleared funds ─────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[PromoteAwaitingOrders]
    @PaymentIntentId NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [dbo].[Orders]
    SET    DeliveryStatus = 'Processing',
           UpdatedAt      = GETUTCDATE()
    WHERE  PaymentIntentId = @PaymentIntentId
      AND  DeliveryStatus  = 'AwaitingPayment';

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- ─── 2. Payment failed: bank rejected the transfer ──────────────────────────
--    Stock is kept reserved — buyer has 30 days to retry.
CREATE OR ALTER PROCEDURE [dbo].[SetPaymentFailedOrders]
    @PaymentIntentId NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [dbo].[Orders]
    SET    DeliveryStatus = 'PaymentFailed',
           UpdatedAt      = GETUTCDATE()
    WHERE  PaymentIntentId = @PaymentIntentId
      AND  DeliveryStatus  = 'AwaitingPayment';

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- ─── 3. Get orders by PaymentIntentId with buyer/seller/address details ──────
--    Used by payment_intent webhook handlers and retry logic.
--    @StatusFilter: 'AwaitingPayment', 'PaymentFailed', or NULL (all).
--
--    Schema notes:
--      - Sellers.UserId is the PK (same as the seller's Users.UserId)
--      - Sellers has no Email column — email comes from Users
--      - Items are normalised into OrderItems; CartItemsJson is rebuilt via FOR JSON PATH
--      - OrderShippingDetails is a snapshot taken at order creation time
CREATE OR ALTER PROCEDURE [dbo].[GetOrdersByPaymentIntentId]
    @PaymentIntentId NVARCHAR(255),
    @StatusFilter    NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.OrderId,
        o.BuyerId,
        o.SellerId,
        o.ShippingId,
        o.TotalAmount,
        o.DeliveryStatus,
        o.PaymentIntentId,
        o.CreatedAt AS OrderDate,

        -- Buyer details
        u.Email    AS BuyerEmail,
        u.Username AS BuyerName,

        -- Seller details (BusinessName from Sellers, Email from Users)
        COALESCE(s.BusinessName, sel_u.Username) AS SellerBusinessName,
        sel_u.Email                              AS SellerEmail,

        -- Shipping snapshot captured at order time
        osd.FullName        AS ShippingFullName,
        osd.AddressLine1    AS ShippingAddressLine1,
        osd.City            AS ShippingCity,
        osd.Country         AS ShippingCountry,
        osd.PostalCode      AS ShippingPostalCode,
        osd.StateOrProvince AS ShippingStateOrProvince,

        -- Tracking info (added by migration 007)
        o.TrackingNumber,
        o.TrackingUrl,
        o.UpdatedAt AS LastStatusChange,

        -- Seller payout status (to detect if funds already released when dispute arrives)
        sp.Status   AS PayoutStatus,
        sp.PaidAt   AS PayoutPaidAt,

        -- Order items rebuilt as JSON (mirrors the GetUserOrders pattern)
        (
            SELECT
                oi.OrderItemId,
                oi.ProductId,
                oi.ProductName,
                oi.Quantity,
                oi.UnitPrice    AS Price,
                oi.ShippingPrice,
                oi.ProductImageUrl,
                CASE
                    WHEN oi.ShippingPrice = p.ExpressShippingPrice THEN 'express'
                    ELSE 'standard'
                END AS ShippingType
            FROM   [dbo].[OrderItems] oi
            LEFT JOIN [dbo].[Products] p ON oi.ProductId = p.ProductId
            WHERE  oi.OrderId = o.OrderId
            FOR JSON PATH
        ) AS CartItemsJson

    FROM  [dbo].[Orders]                    o
    INNER JOIN [dbo].[Users]                u     ON o.BuyerId  = u.UserId
    INNER JOIN [dbo].[Users]                sel_u ON o.SellerId = sel_u.UserId
    LEFT  JOIN [dbo].[Sellers]              s     ON o.SellerId = s.UserId
    LEFT  JOIN [dbo].[OrderShippingDetails] osd   ON osd.OrderId = o.OrderId
    LEFT  JOIN [dbo].[SellerPayouts]        sp    ON sp.OrderId  = o.OrderId

    WHERE o.PaymentIntentId = @PaymentIntentId
      AND (@StatusFilter IS NULL OR o.DeliveryStatus = @StatusFilter);
END;
GO

-- ─── 4. Retry: update PaymentFailed orders with a new payment intent ─────────
--    @NewDeliveryStatus: 'AwaitingPayment' (SEPA retry) or 'Processing' (card retry)
CREATE OR ALTER PROCEDURE [dbo].[RetryOrderPayment]
    @OriginalPaymentIntentId NVARCHAR(255),
    @NewPaymentIntentId      NVARCHAR(255),
    @NewDeliveryStatus       NVARCHAR(50),
    @BuyerId                 NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [dbo].[Orders]
    SET    PaymentIntentId = @NewPaymentIntentId,
           DeliveryStatus  = @NewDeliveryStatus,
           UpdatedAt       = GETUTCDATE()
    WHERE  PaymentIntentId = @OriginalPaymentIntentId
      AND  DeliveryStatus  = 'PaymentFailed'
      AND  BuyerId         = @BuyerId;

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- ─── 5. Cleanup: find PaymentFailed orders older than N days ─────────────────
--    Used by the daily 10:00 cron. Stock is restored and order is cancelled
--    if the buyer never retried within the window.
CREATE OR ALTER PROCEDURE [dbo].[GetExpiredFailedSepaOrders]
    @DaysOld INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        o.OrderId,
        o.BuyerId,
        o.TotalAmount,
        o.PaymentIntentId,
        u.Email    AS BuyerEmail,
        u.Username AS BuyerName
    FROM  [dbo].[Orders]      o
    INNER JOIN [dbo].[Users]  u ON o.BuyerId = u.UserId
    WHERE o.DeliveryStatus = 'PaymentFailed'
      AND o.UpdatedAt      <= DATEADD(DAY, -@DaysOld, GETUTCDATE());
END;
GO

-- ─── 6. Direct status update (cron/internal use — no seller auth, no transitions) ──
--    Used by the 30-day cleanup cron to force PaymentFailed → Cancelled.
CREATE OR ALTER PROCEDURE [dbo].[UpdateOrderStatusDirect]
    @OrderId        VARCHAR(50),
    @DeliveryStatus NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [dbo].[Orders]
    SET    DeliveryStatus = @DeliveryStatus,
           UpdatedAt      = GETUTCDATE()
    WHERE  OrderId = @OrderId;

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- ─── 7. Extend DeliveryStatus CHECK constraint ───────────────────────────────
--    Add AwaitingPayment and PaymentFailed to the allowed values.
--    Safe to re-run: drops by name if it exists, then re-creates.
DECLARE @con NVARCHAR(200);
SELECT @con = dc.name
FROM   sys.check_constraints dc
INNER JOIN sys.columns        c  ON dc.parent_object_id = c.object_id
                                 AND dc.parent_column_id = c.column_id
WHERE  c.name = 'DeliveryStatus'
  AND  OBJECT_NAME(dc.parent_object_id) = 'Orders';

IF @con IS NOT NULL
    EXEC('ALTER TABLE [dbo].[Orders] DROP CONSTRAINT ' + @con);

ALTER TABLE [dbo].[Orders]
ADD CONSTRAINT CK_Orders_DeliveryStatus
CHECK (DeliveryStatus IN (
    'Processing', 'Confirmed', 'Shipped', 'Delivered',
    'Cancelled',  'Rejected',  'Sold',
    'ReturnRequested', 'ReturnApproved',
    'AwaitingPayment', 'PaymentFailed'
));
GO

-- ─── Verify installed procedures ─────────────────────────────────────────────
SELECT OBJECT_NAME(object_id) AS ProcedureName, create_date, modify_date
FROM   sys.objects
WHERE  type = 'P'
  AND  OBJECT_NAME(object_id) IN (
           'PromoteAwaitingOrders',
           'SetPaymentFailedOrders',
           'GetOrdersByPaymentIntentId',
           'RetryOrderPayment',
           'GetExpiredFailedSepaOrders',
           'UpdateOrderStatusDirect'
       );
