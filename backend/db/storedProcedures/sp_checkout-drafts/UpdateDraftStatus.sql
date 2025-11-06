USE Marketplace
GO
CREATE OR ALTER PROCEDURE UpdateDraftStatus
    @DraftId VARCHAR(50),
    @NewStatus VARCHAR(20)   -- e.g., 'cancelled', 'expired', 'failed', 'pending'
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE CheckoutDrafts
    SET Status = @NewStatus,
        UpdatedAt = GETDATE()
    WHERE DraftId = @DraftId;
END;
GO
