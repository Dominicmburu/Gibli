USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CreateOrder
    @OrderId VARCHAR(50),
    @BuyerId VARCHAR(50),
    @SellerId VARCHAR(50),
    @ShippingId VARCHAR(50),
    @TotalAmount DECIMAL(10,2),
    @PaymentIntentId NVARCHAR(255),
    @DeliveryStatus NVARCHAR(50),
    @CartItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 🧾 1️⃣ Insert into Orders
        INSERT INTO Orders (
            OrderId, BuyerId, SellerId, ShippingId,
            TotalAmount, PaymentIntentId, DeliveryStatus, CreatedAt
        )
        VALUES (
            @OrderId, @BuyerId, @SellerId, @ShippingId,
            @TotalAmount, @PaymentIntentId, @DeliveryStatus, GETDATE()
        );

        -- 🧱 2️⃣ Insert OrderItems (parsed from JSON array)
        -- Each element of @CartItemsJson should have:
        -- ProductId, Quantity, UnitPrice, ProductName, Description, ProductImageUrl,
        -- CategoryId, SubCategoryId, ShippingPrice
        INSERT INTO OrderItems (
            OrderItemId, OrderId, ProductId, Quantity, UnitPrice,
            ShippingPrice, ProductName, Description,
            ProductImageUrl, CategoryId, SubCategoryId, CreatedAt
        )
        SELECT
            NEWID() AS OrderItemId,
            @OrderId,
            JSON_VALUE(item.value, '$.ProductId') AS ProductId,
            CAST(JSON_VALUE(item.value, '$.Quantity') AS INT) AS Quantity,
            CAST(
                COALESCE(
                    JSON_VALUE(item.value, '$.UnitPrice'),
                    JSON_VALUE(item.value, '$.Price')
                ) AS DECIMAL(10,2)
            ) AS UnitPrice,
            ISNULL(CAST(JSON_VALUE(item.value, '$.ShippingPrice') AS DECIMAL(10,2)), 0) AS ShippingPrice,
            JSON_VALUE(item.value, '$.ProductName') AS ProductName,
            JSON_VALUE(item.value, '$.Description') AS Description,
            JSON_VALUE(item.value, '$.ProductImageUrl') AS ProductImageUrl,
            JSON_VALUE(item.value, '$.CategoryId') AS CategoryId,
            JSON_VALUE(item.value, '$.SubCategoryId') AS SubCategoryId,
            GETDATE() AS CreatedAt
        FROM OPENJSON(@CartItemsJson) AS item;

        -- 📦 3️⃣ Atomic stock check + deduction in a single statement.
        -- Using WHERE InStock >= qty means the UPDATE only succeeds if stock is sufficient
        -- at the exact moment of the write — no race condition between check and deduction.
        UPDATE p
        SET p.InStock = p.InStock - CAST(JSON_VALUE(item.value, '$.Quantity') AS INT)
        FROM Products p
        INNER JOIN OPENJSON(@CartItemsJson) AS item
            ON p.ProductId = JSON_VALUE(item.value, '$.ProductId')
        WHERE p.InStock >= CAST(JSON_VALUE(item.value, '$.Quantity') AS INT);

        -- If any product row was NOT updated (rows affected < items count), stock was insufficient
        IF @@ROWCOUNT < (SELECT COUNT(*) FROM OPENJSON(@CartItemsJson))
        BEGIN
            RAISERROR('One or more items no longer have sufficient stock. Please review your cart.', 16, 1);
        END

        -- 🔔 4️⃣ Auto-flag NeedsRestock when stock drops to or below LowStockThreshold
        UPDATE p
        SET p.NeedsRestock = 1
        FROM Products p
        INNER JOIN OPENJSON(@CartItemsJson) AS item
            ON p.ProductId = JSON_VALUE(item.value, '$.ProductId')
        WHERE p.InStock <= p.LowStockThreshold AND p.NeedsRestock = 0;

        -- ✅ 4️⃣ Snapshot user shipping info at order time
        INSERT INTO OrderShippingDetails (
            OrderShippingId, OrderId, FullName, PhoneNumber,
            AddressLine1, AddressLine2, City, StateOrProvince,
            PostalCode, Country, CreatedAt
        )
        SELECT
            NEWID(),
            @OrderId,
            s.FullName,
            s.PhoneNumber,
            s.AddressLine1,
            s.AddressLine2,
            s.City,
            s.StateOrProvince,
            s.PostalCode,
            s.Country,
            GETDATE()
        FROM ShippingDetails s
        WHERE s.ShippingId = @ShippingId;

        COMMIT TRANSACTION;
    END TRY

    BEGIN CATCH
        ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();

        RAISERROR(@ErrMsg, @ErrSeverity, @ErrState);
    END CATCH
END;
GO
