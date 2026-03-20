-- Migration 007: Add tracking number and tracking URL to Orders
-- Run ONCE.

ALTER TABLE Orders
ADD TrackingNumber NVARCHAR(100) NULL,
    TrackingUrl    NVARCHAR(500) NULL;
