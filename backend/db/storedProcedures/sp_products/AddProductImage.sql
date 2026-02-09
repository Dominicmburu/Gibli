USE Marketplace
GO
CREATE OR ALTER PROCEDURE AddProductImage
    @ImageId VARCHAR(50),
    @ProductId VARCHAR(50),
    @UserId VARCHAR(50),
    @ImageUrl VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate product exists and belongs to the user
    IF NOT EXISTS (SELECT 1 FROM Products WHERE ProductId = @ProductId AND UserId = @UserId)
    BEGIN
        RAISERROR('Product not found or you do not own this product.', 16, 1);
        RETURN;
    END

    -- Check image count (max 4)
    DECLARE @ImageCount INT;
    SELECT @ImageCount = COUNT(*) FROM ProductImages WHERE ProductId = @ProductId;

    IF @ImageCount >= 4
    BEGIN
        RAISERROR('Maximum of 4 images allowed per product.', 16, 1);
        RETURN;
    END

    -- Insert the image
    INSERT INTO ProductImages (ImageId, ProductId, ImageUrl)
    VALUES (@ImageId, @ProductId, @ImageUrl);

    -- Return the inserted image
    SELECT @ImageId AS ImageId, @ImageUrl AS ImageUrl;
END
GO
