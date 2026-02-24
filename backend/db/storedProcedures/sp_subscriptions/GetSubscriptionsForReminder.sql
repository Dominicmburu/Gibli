USE Marketplace;
GO

-- Returns subscriptions that expire in exactly @DaysAhead days (±12 hours window)
-- and haven't had a reminder sent yet for that threshold.
CREATE OR ALTER PROCEDURE GetSubscriptionsForReminder
    @DaysAhead INT   -- 14, 7, or 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @WindowStart DATETIME = DATEADD(DAY, @DaysAhead, GETDATE()) - 0.5;  -- 12h before
    DECLARE @WindowEnd   DATETIME = DATEADD(DAY, @DaysAhead, GETDATE()) + 0.5;  -- 12h after

    SELECT
        ss.SubscriptionId,
        ss.SellerId,
        ss.CurrentPeriodEnd,
        ss.CancelAtPeriodEnd,
        ss.ReminderSent14,
        ss.ReminderSent7,
        ss.ReminderSent1,
        sp.PlanName,
        sp.PlanCode,
        sp.Price,
        sp.BillingCycle,
        u.Email,
        s.BusinessName
    FROM SellerSubscriptions ss
    JOIN SubscriptionPlans sp ON ss.PlanId = sp.PlanId
    JOIN Users u ON ss.SellerId = u.UserId
    JOIN Sellers s ON ss.SellerId = s.UserId
    WHERE ss.Status IN ('active', 'cancelling')
      AND sp.PlanCode != 'free'
      AND ss.CurrentPeriodEnd BETWEEN @WindowStart AND @WindowEnd
      AND (
            (@DaysAhead = 14 AND ss.ReminderSent14 = 0)
         OR (@DaysAhead = 7  AND ss.ReminderSent7  = 0)
         OR (@DaysAhead = 1  AND ss.ReminderSent1  = 0)
      );
END;
GO
