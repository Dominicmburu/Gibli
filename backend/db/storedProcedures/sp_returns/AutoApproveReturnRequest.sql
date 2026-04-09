USE Marketplace;
GO

-- Auto-approves a return request when the seller did not respond within 3 days.
-- The Stripe refund and stock restoration are handled in the cron job (JS side).
CREATE OR ALTER PROCEDURE AutoApproveReturnRequest
    @ReturnRequestId VARCHAR(50),
    @OrderId         VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE OrderReturnRequests
    SET Status             = 'Approved',
        SellerInstructions = 'Your return was auto-approved because the seller did not respond in time. A full refund has been issued to your original payment method.',
        ResolutionType     = 'auto_approved',
        ResolvedAt         = GETDATE()
    WHERE ReturnRequestId = @ReturnRequestId;

    -- Mark order as fully refunded and close it
    UPDATE Orders
    SET RefundStatus   = 'Refunded',
        DeliveryStatus = 'Sold',
        UpdatedAt      = GETDATE()
    WHERE OrderId = @OrderId;
END;
GO
