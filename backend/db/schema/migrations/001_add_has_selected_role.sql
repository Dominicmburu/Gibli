-- ============================================================
-- Migration: 001_add_has_selected_role
-- Description: Adds HasSelectedRole column to Users table.
--              Used to track whether a user has completed the
--              first-login role selection modal (Buyer / Seller).
--
-- Run ONCE against your database before deploying the new
-- onboarding feature.
-- ============================================================

-- Step 1: Add the column (defaults to 0 = not yet selected)
ALTER TABLE Users
ADD HasSelectedRole BIT NOT NULL DEFAULT 0;
GO

-- Step 2: Mark ALL existing users as already done so they
--         never see the modal after this migration is applied.
-- GO is required — SQL Server parses the full batch before executing,
-- so the UPDATE would fail with "Invalid column name" without it.
UPDATE Users
SET HasSelectedRole = 1;
GO

-- ============================================================
-- After this migration:
--   • Every user created from this point on gets HasSelectedRole = 0
--     automatically (via the DEFAULT constraint).
--   • The CreateUser stored procedure requires NO changes.
--   • On login, GetUserByEmail will return HasSelectedRole in
--     the result set — the backend login endpoint reads it and
--     includes hasSelectedRole in the JWT payload.
-- ============================================================
