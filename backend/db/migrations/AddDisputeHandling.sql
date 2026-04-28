-- ============================================================
-- DISPUTE HANDLING PROCEDURES
--
-- Fired by charge.dispute.created / charge.dispute.closed webhooks.
-- Works for both card and SEPA payments.
--
-- Run against the target database (Marketplace locally,
-- giblidatabase in production). No USE statement — connect to the
-- correct DB before running. CREATE OR ALTER is safe to re-run.
-- ============================================================

-- ─── 1. Freeze payouts when a dispute is opened ──────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[FreezeSellerPayoutByPI]
    @PaymentIntentId NVARCHAR(255),
    @DisputeId       NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- Capture previous status before overwriting so the caller knows
    -- whether funds were already released to the seller.
    DECLARE @captured TABLE (
        PayoutId     VARCHAR(50),
        PrevStatus   NVARCHAR(50),
        Amount       DECIMAL(10,2)
    );

    UPDATE sp
    SET    sp.Status    = 'Disputed',
           sp.AdminNote = CONCAT(
               'Dispute ', @DisputeId, ' opened at ',
               CONVERT(VARCHAR(23), GETUTCDATE(), 120),
               '. Previous status: ', sp.Status, '.'
           )
    OUTPUT DELETED.PayoutId, DELETED.Status, DELETED.Amount
    INTO   @captured
    FROM   [dbo].[SellerPayouts]  sp
    INNER JOIN [dbo].[Orders]     o  ON sp.OrderId = o.OrderId
    WHERE  o.PaymentIntentId = @PaymentIntentId;

    SELECT
        PayoutId,
        PrevStatus,
        Amount,
        (SELECT COUNT(*) FROM @captured) AS RowsFrozen
    FROM @captured;
END;
GO

-- ─── 2. Resolve payouts when dispute closes ──────────────────────────────────
--    @Outcome: 'won'  → restore payout to Pending (money stays with seller)
--             'lost' → mark DisputeLost (Stripe reversed the charge)
CREATE OR ALTER PROCEDURE [dbo].[UnfreezeSellerPayoutByPI]
    @PaymentIntentId NVARCHAR(255),
    @DisputeId       NVARCHAR(255),
    @Outcome         NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NewStatus NVARCHAR(50) =
        CASE WHEN @Outcome = 'won' THEN 'Pending' ELSE 'DisputeLost' END;

    UPDATE sp
    SET    sp.Status    = @NewStatus,
           sp.AdminNote = CONCAT(
               ISNULL(sp.AdminNote, ''),
               ' | Dispute ', @DisputeId, ' ', @Outcome,
               ' at ', CONVERT(VARCHAR(23), GETUTCDATE(), 120), '.'
           )
    FROM   [dbo].[SellerPayouts]  sp
    INNER JOIN [dbo].[Orders]     o  ON sp.OrderId = o.OrderId
    WHERE  o.PaymentIntentId = @PaymentIntentId
      AND  sp.Status         = 'Disputed';

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT OBJECT_NAME(object_id) AS ProcedureName, create_date, modify_date
FROM   sys.objects
WHERE  type = 'P'
  AND  OBJECT_NAME(object_id) IN ('FreezeSellerPayoutByPI', 'UnfreezeSellerPayoutByPI');
