USE Marketplace;
GO

CREATE OR ALTER PROCEDURE InsertReturnItem
    @ReturnItemId     VARCHAR(50),
    @ReturnRequestId  VARCHAR(50),
    @OrderItemId      VARCHAR(50),
    @ProductId        VARCHAR(50),
    @ProductName      NVARCHAR(255),
    @ProductImageUrl  NVARCHAR(MAX) = NULL,
    @ReturnQuantity   INT,
    @UnitPrice        DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OrderReturnItems (
        ReturnItemId, ReturnRequestId, OrderItemId, ProductId,
        ProductName, ProductImageUrl, ReturnQuantity, UnitPrice
    ) VALUES (
        @ReturnItemId, @ReturnRequestId, @OrderItemId, @ProductId,
        @ProductName, @ProductImageUrl, @ReturnQuantity, @UnitPrice
    );
END;
GO
