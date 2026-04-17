USE Marketplace;
GO

-- Table to store restock notification requests
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RestockReminders')
BEGIN
    CREATE TABLE RestockReminders (
        ReminderId   VARCHAR(50)   NOT NULL PRIMARY KEY,
        ProductId    VARCHAR(50)   NOT NULL,
        UserId       VARCHAR(50)   NOT NULL,
        Email        NVARCHAR(255) NOT NULL,
        CreatedAt    DATETIME      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_RestockReminder UNIQUE (ProductId, UserId)
    );
END
GO

-- Add reminder (ignore if already exists)
CREATE OR ALTER PROCEDURE UpsertRestockReminder
    @ReminderId VARCHAR(50),
    @ProductId  VARCHAR(50),
    @UserId     VARCHAR(50),
    @Email      NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM RestockReminders WHERE ProductId = @ProductId AND UserId = @UserId)
    BEGIN
        INSERT INTO RestockReminders (ReminderId, ProductId, UserId, Email, CreatedAt)
        VALUES (@ReminderId, @ProductId, @UserId, @Email, GETDATE());
    END
    SELECT ReminderId, ProductId, UserId, Email, CreatedAt
    FROM RestockReminders
    WHERE ProductId = @ProductId AND UserId = @UserId;
END
GO

-- Check if user already has a reminder for a product
CREATE OR ALTER PROCEDURE GetUserRestockReminder
    @ProductId VARCHAR(50),
    @UserId    VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ReminderId, ProductId, UserId, Email, CreatedAt
    FROM RestockReminders
    WHERE ProductId = @ProductId AND UserId = @UserId;
END
GO

-- Get all reminders for a product (used when seller restocks)
CREATE OR ALTER PROCEDURE GetRestockRemindersByProduct
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.ReminderId, r.Email, u.Username, p.ProductName
    FROM RestockReminders r
    INNER JOIN Users u ON r.UserId = u.UserId
    INNER JOIN Products p ON r.ProductId = p.ProductId
    WHERE r.ProductId = @ProductId;
END
GO

-- Delete all reminders for a product after notifications are sent
CREATE OR ALTER PROCEDURE DeleteRestockRemindersByProduct
    @ProductId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM RestockReminders WHERE ProductId = @ProductId;
END
GO

-- Remove a single reminder (buyer cancels)
CREATE OR ALTER PROCEDURE DeleteRestockReminder
    @ProductId VARCHAR(50),
    @UserId    VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM RestockReminders WHERE ProductId = @ProductId AND UserId = @UserId;
END
GO
