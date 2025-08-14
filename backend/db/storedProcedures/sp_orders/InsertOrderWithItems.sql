USE Marketplace
GO

CREATE OR ALTER PROCEDURE InsertOrderWithItems
    @OrderId VARCHAR(50),
    @BuyerId VARCHAR(50),
    @OrderDate DATETIME,
    @TotalAmount DECIMAL(10,2),
    @Items OrderItemType READONLY -- TVP (Table-Valued Parameter)
AS
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Insert into Orders table using BuyerId
        INSERT INTO Orders (OrderId, BuyerId, OrderDate, TotalAmount, Status)
        VALUES (@OrderId, @BuyerId, @OrderDate, @TotalAmount, 'pending');

        -- Insert into OrderItems
        INSERT INTO OrderItems (OrderItemId, OrderId, ProductId, Quantity, UnitPrice, ItemTotal, Status)
        SELECT 
            NEWID(), 
            @OrderId, 
            ProductId, 
            Quantity, 
            UnitPrice, 
            ItemTotal,
            'pending'
        FROM @Items;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
