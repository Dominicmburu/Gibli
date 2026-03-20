-- Migration 003: Add HasCompletedOnboarding flag to Sellers table
-- This flag is set to 1 once the seller explicitly completes their plan selection
-- (either by choosing the free plan or completing a paid subscription payment).
-- It gates "My Store" visibility in the Navbar and dismisses the setup banner.

ALTER TABLE Sellers
ADD HasCompletedOnboarding BIT NOT NULL DEFAULT 0;
