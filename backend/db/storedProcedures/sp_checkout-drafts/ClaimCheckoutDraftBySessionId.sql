-- Atomically claim a checkout draft by its PayPal SessionId.
-- Returns the draft row if this caller claimed it (IsUsed was 0).
-- Returns empty result set if already claimed.
CREATE OR ALTER PROCEDURE ClaimCheckoutDraftBySessionId
    @SessionId VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE CheckoutDrafts
    SET    IsUsed = 1, UpdatedAt = GETUTCDATE()
    WHERE  SessionId = @SessionId AND IsUsed = 0;

    IF @@ROWCOUNT = 1
        SELECT * FROM CheckoutDrafts WHERE SessionId = @SessionId;
END;
