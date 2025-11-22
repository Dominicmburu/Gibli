USE Marketplace
GO
CREATE OR ALTER PROCEDURE SearchProducts
    @SearchTerm NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        p.ProductId,
        p.ProductName,
        p.InStock,
        p.Price,
        p.CreatedAt,
        p.UpdatedAt,
        s.BusinessName,
        s.Country,
        pi.ImageUrl
    FROM Products p
    INNER JOIN Sellers s ON p.UserId = s.UserId
    OUTER APPLY (
        SELECT TOP 1 ImageUrl 
        FROM ProductImages 
        WHERE ProductId = p.ProductId
        ORDER BY ImageId
    ) pi
    WHERE 
        s.IsVerified = 0 
        AND p.InStock > 0
        AND p.ProductName LIKE '%' + @SearchTerm + '%'
    ORDER BY 
        CASE 
            WHEN p.ProductName LIKE @SearchTerm + '%' THEN 1  -- Starts with search term (highest priority)
            WHEN p.ProductName LIKE '%' + @SearchTerm THEN 2   -- Ends with search term
            ELSE 3                                              -- Contains search term anywhere
        END,
        p.ProductName;  -- Then alphabetically
END