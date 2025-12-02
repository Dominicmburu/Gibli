USE Marketplace;
GO
---NOT SAFE -------- USE ONLY IN TEST MODE--------
CREATE OR ALTER PROCEDURE DeleteUserCompletely
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Step 1: Delete OrderShippingDetails linked to Orders (as Seller or Buyer)
        DELETE FROM OrderShippingDetails
        WHERE OrderId IN (
            SELECT OrderId FROM Orders
            WHERE BuyerId = @UserId OR SellerId = @UserId
        );

        -- Step 2: Delete OrderItems linked to those Orders
        DELETE FROM OrderItems
        WHERE OrderId IN (
            SELECT OrderId FROM Orders
            WHERE BuyerId = @UserId OR SellerId = @UserId
        );

        -- Step 3: Delete Orders where user is Buyer or Seller
        DELETE FROM Orders
        WHERE BuyerId = @UserId OR SellerId = @UserId;

        -- Step 4: Delete Products by the user (seller)
        DELETE FROM Products
        WHERE UserId = @UserId;

        -- Step 5: Delete Seller profile (if exists)
        DELETE FROM Sellers
        WHERE UserId = @UserId;

        -- Step 6: Delete Shipping Details
        DELETE FROM ShippingDetails
        WHERE UserId = @UserId;

        -- Step 7: Finally, delete the user record itself
        DELETE FROM Users
        WHERE UserId = @UserId;

        COMMIT TRANSACTION;

        PRINT '✅ User and all related data deleted successfully.';
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        PRINT '❌ Error occurred while deleting user.';
        PRINT ERROR_MESSAGE();
    END CATCH
END;
GO

EXEC DeleteUserCompletely @UserId = 'e529cafe-c861-4d85-9115-5464a8478235';
