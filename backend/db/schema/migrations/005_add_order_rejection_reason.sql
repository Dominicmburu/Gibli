-- Migration 005: Add RejectionReason column to Orders table
-- Stores the seller's reason when an order is rejected.
-- Also used for auto-cancellation reason (48hr seller inactivity).

ALTER TABLE Orders
ADD RejectionReason NVARCHAR(500) NULL;
