USE Marketplace
GO
CREATE OR ALTER PROCEDURE GetProductsPaginated
    @limit INT,
    @offset INT,
    @searchTerm NVARCHAR(100) = NULL,  
    @categoryId INT = NULL
AS
BEGIN

SET NOCOUNT ON
--GETTING THE TOTAL COUNT
--Gets total number of products matching filters/search term — used for pagination logic.
SELECT 
        COUNT(*) AS TotalCount
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId
    WHERE 
        p.InStock > 0
        AND (@searchTerm IS NULL 
            OR p.ProductName LIKE '%' + @searchTerm + '%'
            OR p.Description LIKE '%' + @searchTerm + '%')
        AND (@categoryId IS NULL OR p.CategoryId = @categoryId);

    SELECT 
        p.ProductId,
        p.ProductName,
        p.Description,
        p.InStock,
        p.Price,
        p.CreatedAt,
        p.UpdatedAt,
        s.BusinessName,
        s.Country,
        -- Get only the first image per product (can be changed if needed)
        pi.ImageUrl
    FROM Products p
    
    INNER JOIN Sellers s ON p.UserId = s.UserId
    OUTER APPLY (
        SELECT TOP 1 ImageUrl 
        FROM ProductImages 
        WHERE ProductId = p.ProductId 
        ORDER BY ImageId -- assuming ImageId reflects upload order
    ) pi
    WHERE InStock>0
    AND (@searchTerm IS NULL 
            OR p.ProductName LIKE '%' + @searchTerm + '%'
            OR p.Description LIKE '%' + @searchTerm + '%')
        AND (@categoryId IS NULL OR p.CategoryId = @categoryId)
    ORDER BY p.CreatedAt DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY;
END
