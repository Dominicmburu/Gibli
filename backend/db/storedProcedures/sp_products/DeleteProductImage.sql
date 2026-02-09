USE Marketplace
GO
CREATE OR ALTER PROCEDURE DeleteProductImage
    @ImageId VARCHAR(50),
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate the image exists and belongs to a product owned by the user
    DECLARE @ImageUrl VARCHAR(MAX);
    DECLARE @ProductId VARCHAR(50);

    SELECT @ImageUrl = pi.ImageUrl, @ProductId = pi.ProductId
    FROM ProductImages pi
    INNER JOIN Products p ON pi.ProductId = p.ProductId
    WHERE pi.ImageId = @ImageId AND p.UserId = @UserId;

    IF @ImageUrl IS NULL
    BEGIN
        RAISERROR('Image not found or you do not own this product.', 16, 1);
        RETURN;
    END

    -- Check that the product has more than 1 image (must keep at least 1)
    DECLARE @ImageCount INT;
    SELECT @ImageCount = COUNT(*) FROM ProductImages WHERE ProductId = @ProductId;

    IF @ImageCount <= 1
    BEGIN
        RAISERROR('Cannot delete the last image. A product must have at least 1 image.', 16, 1);
        RETURN;
    END

    -- Delete the image
    DELETE FROM ProductImages WHERE ImageId = @ImageId;

    -- Return the URL so the backend can delete from S3
    SELECT @ImageUrl AS ImageUrl;
END
GO
