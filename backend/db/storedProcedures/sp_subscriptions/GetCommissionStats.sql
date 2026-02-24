USE Marketplace;
GO

-- Returns commission statistics for a specific seller (or all sellers if @SellerId is NULL).
-- Designed to power the admin dashboard in the future.
CREATE OR ALTER PROCEDURE GetCommissionStats
    @SellerId   VARCHAR(50) NULL = NULL,
    @DateFrom   DATETIME NULL = NULL,
    @DateTo     DATETIME NULL = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        cl.SellerId,
        s.BusinessName,
        COUNT(cl.LedgerId)          AS TotalOrders,
        SUM(cl.GrossAmount)         AS TotalGross,
        SUM(cl.CommissionAmount)    AS TotalCommission,
        SUM(cl.NetAmount)           AS TotalNet,
        AVG(cl.CommissionRate)      AS AvgCommissionRate,
        MIN(cl.CreatedAt)           AS FirstOrderDate,
        MAX(cl.CreatedAt)           AS LastOrderDate
    FROM CommissionLedger cl
    JOIN Sellers s ON cl.SellerId = s.UserId
    WHERE
        (@SellerId IS NULL OR cl.SellerId = @SellerId)
        AND (@DateFrom IS NULL OR cl.CreatedAt >= @DateFrom)
        AND (@DateTo   IS NULL OR cl.CreatedAt <= @DateTo)
    GROUP BY cl.SellerId, s.BusinessName
    ORDER BY TotalCommission DESC;
END;
GO
