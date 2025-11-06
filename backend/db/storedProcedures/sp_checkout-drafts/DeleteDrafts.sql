USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteDrafts
    @HoursOld INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    -- Option 1: delete drafts that are still pending and older than @HoursOld
    DELETE FROM CheckoutDrafts
    WHERE IsUsed = 0
      AND Status = 'pending'
      AND CreatedAt < DATEADD(HOUR, -@HoursOld, GETDATE());

    -- If you prefer to mark as expired instead of delete, use:
    /*
    UPDATE CheckoutDrafts
    SET Status = 'expired', UpdatedAt = GETDATE()
    WHERE IsUsed = 0
      AND Status = 'pending'
      AND CreatedAt < DATEADD(HOUR, -@HoursOld, GETDATE());
    */
END;
GO
