USE Marketplace;
GO

CREATE OR ALTER PROCEDURE GetReturnItems
    @ReturnRequestId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ri.ReturnItemId,
        ri.OrderItemId,
        ri.ProductId,
        ri.ProductName,
        ri.ProductImageUrl,
        ri.ReturnQuantity,
        ri.UnitPrice,
        ri.ReturnQuantity * ri.UnitPrice AS ItemRefundAmount
    FROM OrderReturnItems ri
    WHERE ri.ReturnRequestId = @ReturnRequestId
    ORDER BY ri.CreatedAt ASC;
END;
GO
