CREATE DATABASE Marketplace

USE Marketplace
CREATE TABLE Users (
    UserId VARCHAR(50) NOT NULL PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('admin', 'buyer', 'seller')),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
Use Marketplace
CREATE TABLE PasswordResetRequests (
    ResetId VARCHAR(50) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    TokenHash NVARCHAR(512) NOT NULL,
    --ExpiresAt DATETIME NOT NULL,
    --IsValid BIT NOT NULL DEFAULT 0
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);
USE Marketplace
CREATE TABLE Sellers(
    UserId VARCHAR(50) NOT NULL PRIMARY KEY,
    BusinessNumber NVARCHAR(20) NOT NULL UNIQUE,
    BusinessName NVARCHAR(255) NOT NULL UNIQUE,
    Country VARCHAR(50) NOT NULL,
    IsVerified BIT DEFAULT 0,
    CONSTRAINT FK_Sellers_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    
)
USE Marketplace
ALTER TABLE Sellers
ADD PaymentAccount NVARCHAR(100) NULL;


USE Marketplace
CREATE TABLE Categories(
    CategoryId VARCHAR(50) NOT NULL PRIMARY KEY,
    CategoryName VARCHAR(50) NOT NULL,
    -- Description VARCHAR(MAX)
)


USE Marketplace
CREATE TABLE SubCategories(
    SubCategoryId VARCHAR(50) NOT NULL PRIMARY KEY,
    CategoryId VARCHAR(50) NOT NULL,
    SubCategoryName VARCHAR(50) NOT NULL,
    CONSTRAINT FK_SubCategories_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId)
)

USE Marketplace
CREATE TABLE Products(
    ProductId VARCHAR(50) NOT NULL PRIMARY KEY,
    CategoryId VARCHAR(50) NOT NULL,
    UserId VARCHAR(50) NOT NULL,
    ProductName NVARCHAR(50) NOT NULL,
    Description NVARCHAR(MAX),
    InStock INT NOT NULL CHECK (InStock > 0),
    Price DECIMAL(10,2) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
    CONSTRAINT FK_Products_Sellers FOREIGN KEY (UserId) REFERENCES Sellers(UserId)
)

USE Marketplace
CREATE TABLE ProductImages(
    ImageId VARCHAR(50) NOT NULL PRIMARY KEY,
    ProductId VARCHAR(50) NOT NULL,
    ImageUrl VARCHAR(MAX) NOT NULL, --(MAX) - Since we updated this column is now of size max
    CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId)
)
USE Marketplace
ALTER TABLE ProductImages
ALTER COLUMN ImageUrl VARCHAR(MAX);

-- USE Marketplace
-- CREATE TYPE ImageUrlTableType AS TABLE (
--     ImageUrl VARCHAR(MAX)
-- );

Use Marketplace
-- Drop if it exists (safe for dev environments)
DROP TYPE IF EXISTS ProductImageTableType;
GO
CREATE TYPE ProductImageTableType AS TABLE (
    ImageId VARCHAR(50),
    ImageUrl VARCHAR(MAX)
);

USE Marketplace
CREATE TABLE Orders(
    OrderId VARCHAR(50) NOT NULL PRIMARY KEY,
    BuyerId VARCHAR(50) NOT NULL,
    OrderDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(10,2),
    Status VARCHAR(20) NOT NULL CHECK(Status IN ('pending', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT FK_Orders_Users FOREIGN KEY (BuyerId) REFERENCES Users(UserId)
)

USE Marketplace
CREATE TABLE OrderItems(
    OrderItemId VARCHAR(50) NOT NULL PRIMARY KEY,
    OrderId VARCHAR(50) NOT NULL,
    ProductId VARCHAR(50) NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    ItemTotal DECIMAL(10,2) NOT NULL,
    Status VARCHAR(20) NOT NULL CHECK(Status IN ('pending', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
    CONSTRAINT UQ_Order_Product UNIQUE(OrderId, ProductId)

)
USE Marketplace
CREATE TYPE OrderItemType AS TABLE (
    ProductId VARCHAR(50),
    Quantity INT,
    UnitPrice DECIMAL(10,2),
    ItemTotal DECIMAL(10,2)
);

USE Marketplace
CREATE TABLE Reviews (
    ReviewId VARCHAR(50) NOT NULL PRIMARY KEY,
    ProductId VARCHAR(50) NOT NULL,
    UserId VARCHAR(50) NOT NULL,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment NVARCHAR(MAX) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT FK_Reviews_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

USE Marketplace
CREATE TABLE ReviewMedia (
    MediaId VARCHAR(50) NOT NULL PRIMARY KEY,
    ReviewId VARCHAR(50) NOT NULL,
    ImageURL VARCHAR(2083) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_ReviewMedia_Reviews FOREIGN KEY (ReviewId) REFERENCES Reviews(ReviewId) ON DELETE CASCADE
);

USE Marketplace
CREATE TABLE CartItems (
    CartItemId VARCHAR(50) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    ProductId VARCHAR(50) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    DateAdded DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_CartItems_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_CartItems_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT UQ_Cart_User_Product UNIQUE(UserId, ProductId)
);
USE Marketplace
CREATE TABLE WishList (
    WishListItemId VARCHAR(50) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    ProductId VARCHAR(50) NOT NULL,
    DateAdded DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_WishList_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_WishList_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT UQ_WishList_User_Product UNIQUE(UserId, ProductId)
);

USE Marketplace;
CREATE TABLE ShippingDetails (
    ShippingId VARCHAR(50) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    FullName NVARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(20) NOT NULL,
    AddressLine1 NVARCHAR(255) NOT NULL,
    AddressLine2 NVARCHAR(255),
    City NVARCHAR(100) NOT NULL,
    StateOrProvince NVARCHAR(100),
    PostalCode VARCHAR(20),
    Country VARCHAR(50) NOT NULL,
    -- IsDefault BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_ShippingDetails_Users FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE
);

USE Marketplace
CREATE TABLE Payments (
    PaymentId VARCHAR(50) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    OrderId VARCHAR(50) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL, --From checkout.session.amount_total
    PaymentMethod VARCHAR(50) NOT NULL, -- e.g., MPESA, CARD(Visa, MasterCard, etc.), PAYPAL, Apple Pay / Google Pay
    -- Regarding the PaymentMethod I can extract the method used via Stripe’s API (payment_intent.payment_method_types, or charges.data[0].payment_method_details)
    PaymentStatus VARCHAR(20) DEFAULT 'PENDING', -- SUCCESSFUL, FAILED, REFUNDED
    -- PaymentStatus comes from: payment_intent.status OR 
    -- For more human-readable statuses, Stripe also provides: charges.data[0].status USUALLY (PENDING, sUCCEEDED, FAILED, REFUNDED)
    -- Update via Stripe webhook when the payment succeeds or fails (checkout.session.completed, charge.failed, etc.).
    TransactionRef VARCHAR(100), -- FROM payment_intent.id
    -- Use payment_intent.id as your TransactionRef, since it's the core object tracking the whole payment lifecycle.
    Currency VARCHAR(10) NOT NULL, --From checkout.session.currency
    -- PaidAt DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Payments_Users FOREIGN KEY (UserId) REFERENCES Users(UserId),
    CONSTRAINT FK_Payments_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId)
);

