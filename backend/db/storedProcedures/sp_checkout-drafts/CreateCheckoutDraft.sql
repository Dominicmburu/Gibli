USE Marketplace;
GO

CREATE OR ALTER PROCEDURE CreateCheckoutDraft
    @DraftId VARCHAR(50),
    @BuyerId VARCHAR(50),
    @CartItemsJson NVARCHAR(MAX),
    @ShippingOptionsJson NVARCHAR(MAX),
    @ShippingAddressJson NVARCHAR(MAX),
    @TotalAmount DECIMAL(10,2) = NULL,
    @SessionId NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO CheckoutDrafts (
        DraftId, BuyerId, CartItemsJson, ShippingOptionsJson, ShippingAddressJson,
        TotalAmount, SessionId, Status, IsUsed, CreatedAt
    )
    VALUES (
        @DraftId, @BuyerId, @CartItemsJson, @ShippingOptionsJson, @ShippingAddressJson,
        @TotalAmount, @SessionId, 'pending', 0, GETDATE()
    );
END;
GO

SELECT * FROM CheckoutDrafts WHERE DraftId='8bd80524-7ab1-412e-ba91-51b8332d26f1'