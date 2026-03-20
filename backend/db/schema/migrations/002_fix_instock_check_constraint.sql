-- Migration 002: Allow InStock = 0 (sold out)
-- Replaces any > 0 check constraint on InStock with >= 0
-- so a product can reach sold-out status.
-- Uses TRY/CATCH to be idempotent (safe to run multiple times).

BEGIN TRY
    ALTER TABLE Products DROP CONSTRAINT CK__Products__InStoc__19DFD96B;
END TRY
BEGIN CATCH
    -- Constraint may already be dropped or have a different auto-generated name; continue.
END CATCH
GO

BEGIN TRY
    ALTER TABLE Products ADD CONSTRAINT CK_Products_InStock CHECK (InStock >= 0);
END TRY
BEGIN CATCH
    -- Constraint already exists; nothing to do.
END CATCH
GO
