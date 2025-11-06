USE Marketplace
GO
CREATE OR ALTER PROCEDURE MarkCheckoutDraftAsUsed
    @DraftId VARCHAR(50)
AS
BEGIN
    UPDATE CheckoutDrafts
    SET IsUsed = 1, UpdatedAt = GETDATE()
    WHERE DraftId = @DraftId;
END;
