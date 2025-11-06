USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetCheckoutDraft
    @DraftId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM CheckoutDrafts
    WHERE DraftId = @DraftId AND IsUsed = 0
END;

SELECT * FROM CheckoutDrafts WHERE DraftId = '72665d11-7f17-461c-85c1-10dd6da339ad';