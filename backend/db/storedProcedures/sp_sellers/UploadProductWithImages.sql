USE Marketplace
GO
CREATE OR ALTER PROCEDURE UploadProductWithImages
    @ProductId VARCHAR(50),
    @CategoryId VARCHAR(50),
    @UserId VARCHAR(50),
    @ProductName NVARCHAR(50),
    @Description NVARCHAR(MAX),
    @InStock INT,
    @Price DECIMAL(10,2),
    @Images ProductImageTableType READONLY
AS
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Insert product
        INSERT INTO Products (
            ProductId, CategoryId, UserId, ProductName, Description, InStock, Price
        )
        VALUES (
            @ProductId, @CategoryId, @UserId, @ProductName, @Description, @InStock, @Price
        );

        -- Insert images
        INSERT INTO ProductImages (ImageId, ProductId, ImageUrl)
        SELECT ImageId, @ProductId, ImageUrl
        FROM @Images;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;


