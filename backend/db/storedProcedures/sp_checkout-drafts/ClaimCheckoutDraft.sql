-- Atomically claim a checkout draft for fulfillment.
-- Returns the draft row if this caller claimed it (IsUsed was 0).
-- Returns empty result set if already claimed (IsUsed was already 1).
-- Safe under concurrent calls: only one caller gets @@ROWCOUNT = 1.
CREATE OR ALTER PROCEDURE ClaimCheckoutDraft
    @DraftId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE CheckoutDrafts
    SET    IsUsed = 1, UpdatedAt = GETUTCDATE()
    WHERE  DraftId = @DraftId AND IsUsed = 0;

    IF @@ROWCOUNT = 1
        SELECT * FROM CheckoutDrafts WHERE DraftId = @DraftId;
    -- else: return empty — caller checks recordset length
END;
