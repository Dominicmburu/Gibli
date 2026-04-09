USE Marketplace;
GO

CREATE OR ALTER PROCEDURE EnsureReviewSchema
AS
BEGIN
    SET NOCOUNT ON;

    -- Add missing columns to Reviews
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'OrderId')
        ALTER TABLE Reviews ADD OrderId VARCHAR(50) NULL;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'OrderItemId')
        ALTER TABLE Reviews ADD OrderItemId VARCHAR(50) NULL;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'SellerId')
        ALTER TABLE Reviews ADD SellerId VARCHAR(50) NULL;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'SellerResponse')
        ALTER TABLE Reviews ADD SellerResponse NVARCHAR(MAX) NULL;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'SellerResponseAt')
        ALTER TABLE Reviews ADD SellerResponseAt DATETIME NULL;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'UpdatedAt')
        ALTER TABLE Reviews ADD UpdatedAt DATETIME NULL;

    -- Add missing columns to ReviewMedia
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReviewMedia' AND COLUMN_NAME = 'MediaType')
        ALTER TABLE ReviewMedia ADD MediaType VARCHAR(10) NOT NULL CONSTRAINT DF_ReviewMedia_MediaType DEFAULT 'image';

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReviewMedia' AND COLUMN_NAME = 'MediaURL')
        ALTER TABLE ReviewMedia ADD MediaURL VARCHAR(2083) NULL;

    -- Backfill MediaURL from legacy ImageURL column if it exists (dynamic SQL avoids compile-time column validation)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReviewMedia' AND COLUMN_NAME = 'ImageURL')
        EXEC('UPDATE ReviewMedia SET MediaURL = ISNULL(MediaURL, ImageURL) WHERE MediaURL IS NULL');
    ELSE IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReviewMedia' AND COLUMN_NAME = 'ImageUrl')
        EXEC('UPDATE ReviewMedia SET MediaURL = ISNULL(MediaURL, ImageUrl) WHERE MediaURL IS NULL');

    -- Create ReviewHelpfulVotes table if missing
    IF OBJECT_ID('ReviewHelpfulVotes', 'U') IS NULL
    BEGIN
        CREATE TABLE ReviewHelpfulVotes (
            ReviewId  VARCHAR(50) NOT NULL,
            UserId    VARCHAR(50) NOT NULL,
            IsHelpful BIT NOT NULL DEFAULT 1,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
            PRIMARY KEY (ReviewId, UserId),
            CONSTRAINT FK_ReviewHelpfulVotes_Reviews FOREIGN KEY (ReviewId)
                REFERENCES Reviews(ReviewId) ON DELETE CASCADE,
            CONSTRAINT FK_ReviewHelpfulVotes_Users FOREIGN KEY (UserId)
                REFERENCES Users(UserId)
        );
    END

    -- Replace CASCADE FK on Users with NO ACTION to avoid multiple cascade paths
    IF EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE name = 'FK_ReviewHelpfulVotes_Users'
          AND parent_object_id = OBJECT_ID('ReviewHelpfulVotes')
          AND delete_referential_action_desc = 'CASCADE'
    )
    BEGIN
        ALTER TABLE ReviewHelpfulVotes DROP CONSTRAINT FK_ReviewHelpfulVotes_Users;
        ALTER TABLE ReviewHelpfulVotes ADD CONSTRAINT FK_ReviewHelpfulVotes_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId);
    END

    -- Drop old per-order-item unique index if it exists
    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'UQ_Reviews_OrderItem_User' AND object_id = OBJECT_ID('Reviews')
    )
        DROP INDEX UQ_Reviews_OrderItem_User ON Reviews;

    -- Create per-product unique index if missing
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'UQ_Reviews_Product_User' AND object_id = OBJECT_ID('Reviews')
    )
        EXEC('CREATE UNIQUE INDEX UQ_Reviews_Product_User ON Reviews (ProductId, UserId) WHERE ProductId IS NOT NULL;');
END;
GO
