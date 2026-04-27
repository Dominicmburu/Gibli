USE Marketplace;
GO

-- =============================================
-- TABLE: SubscriptionPlans (static plan definitions)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SubscriptionPlans')
BEGIN
    CREATE TABLE SubscriptionPlans (
        PlanId          INT IDENTITY(1,1) PRIMARY KEY,
        PlanName        NVARCHAR(100) NOT NULL,
        PlanCode        NVARCHAR(50)  NOT NULL UNIQUE,
        Price           DECIMAL(10,2) NOT NULL,
        CommissionRate  DECIMAL(5,4)  NOT NULL,
        BillingCycle    NVARCHAR(20)  NOT NULL CHECK (BillingCycle IN ('none','monthly','yearly')),
        Description     NVARCHAR(MAX) NULL,
        IsActive        BIT NOT NULL DEFAULT 1,
        CreatedAt       DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Seed the 4 plans (idempotent)
IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE PlanCode = 'free')
BEGIN
    INSERT INTO SubscriptionPlans (PlanName, PlanCode, Price, CommissionRate, BillingCycle, Description)
    VALUES
    (
        'Free Plan',
        'free',
        0.00,
        0.0500,
        'none',
        'Default plan. No monthly fee. We take 5% commission on every sale you make.'
    ),
    (
        'Package 1',
        'package_1',
        1.00,
        0.0300,
        'monthly',
        'Pay €1 per month and reduce your commission to 3%. Ideal for testing the subscription experience.'
    ),
    (
        'Package 2',
        'package_2',
        2.00,
        0.0000,
        'monthly',
        'Pay €2 per month and sell with zero commission. Keep 100% of every sale.'
    );
END
GO

-- =============================================
-- TABLE: SellerSubscriptions
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SellerSubscriptions')
BEGIN
    CREATE TABLE SellerSubscriptions (
        SubscriptionId          INT IDENTITY(1,1) PRIMARY KEY,
        SellerId                VARCHAR(50)     NOT NULL,
        PlanId                  INT             NOT NULL,
        Status                  NVARCHAR(30)    NOT NULL DEFAULT 'active'
                                    CHECK (Status IN ('active','cancelling','expired','pending_trial','payment_failed','cancelled')),
        StartDate               DATETIME        NOT NULL DEFAULT GETDATE(),
        CurrentPeriodStart      DATETIME        NULL,
        CurrentPeriodEnd        DATETIME        NULL,
        StripeSubscriptionId    NVARCHAR(255)   NULL,
        StripeCustomerId        NVARCHAR(255)   NULL,
        CancelAtPeriodEnd       BIT             NOT NULL DEFAULT 0,
        ReminderSent14          BIT             NOT NULL DEFAULT 0,
        ReminderSent7           BIT             NOT NULL DEFAULT 0,
        ReminderSent1           BIT             NOT NULL DEFAULT 0,
        CreatedAt               DATETIME        NOT NULL DEFAULT GETDATE(),
        UpdatedAt               DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_SellerSubscriptions_Users
            FOREIGN KEY (SellerId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_SellerSubscriptions_Plans
            FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(PlanId)
    );

    CREATE INDEX IX_SellerSubscriptions_SellerId ON SellerSubscriptions(SellerId);
    CREATE INDEX IX_SellerSubscriptions_Status   ON SellerSubscriptions(Status);
    CREATE INDEX IX_SellerSubscriptions_StripeId ON SellerSubscriptions(StripeSubscriptionId);
END
GO

-- =============================================
-- TABLE: SubscriptionPayments
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SubscriptionPayments')
BEGIN
    CREATE TABLE SubscriptionPayments (
        PaymentId               INT IDENTITY(1,1) PRIMARY KEY,
        SubscriptionId          INT             NOT NULL,
        SellerId                VARCHAR(50)     NOT NULL,
        Amount                  DECIMAL(10,2)   NOT NULL,
        Currency                NVARCHAR(10)    NOT NULL DEFAULT 'EUR',
        StripeInvoiceId         NVARCHAR(255)   NULL,
        StripePaymentIntentId   NVARCHAR(255)   NULL,
        Status                  NVARCHAR(20)    NOT NULL DEFAULT 'successful'
                                    CHECK (Status IN ('successful','failed','refunded')),
        BillingPeriodStart      DATETIME        NULL,
        BillingPeriodEnd        DATETIME        NULL,
        PaidAt                  DATETIME        NULL,
        CreatedAt               DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_SubPayments_Subscription
            FOREIGN KEY (SubscriptionId) REFERENCES SellerSubscriptions(SubscriptionId),
        CONSTRAINT FK_SubPayments_Seller
            FOREIGN KEY (SellerId) REFERENCES Users(UserId)
    );

    CREATE INDEX IX_SubscriptionPayments_SellerId ON SubscriptionPayments(SellerId);
END
GO

-- =============================================
-- TABLE: CommissionLedger
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CommissionLedger')
BEGIN
    CREATE TABLE CommissionLedger (
        LedgerId                INT IDENTITY(1,1) PRIMARY KEY,
        OrderId                 VARCHAR(50)     NOT NULL,
        SellerId                VARCHAR(50)     NOT NULL,
        SubscriptionId          INT             NULL,
        GrossAmount             DECIMAL(10,2)   NOT NULL,
        CommissionRate          DECIMAL(5,4)    NOT NULL,
        CommissionAmount        DECIMAL(10,2)   NOT NULL,
        NetAmount               DECIMAL(10,2)   NOT NULL,
        CreatedAt               DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_CommissionLedger_Order
            FOREIGN KEY (OrderId) REFERENCES Orders(OrderId),
        CONSTRAINT FK_CommissionLedger_Seller
            FOREIGN KEY (SellerId) REFERENCES Users(UserId),
        CONSTRAINT FK_CommissionLedger_Subscription
            FOREIGN KEY (SubscriptionId) REFERENCES SellerSubscriptions(SubscriptionId)
    );

    CREATE INDEX IX_CommissionLedger_SellerId ON CommissionLedger(SellerId);
    CREATE INDEX IX_CommissionLedger_OrderId  ON CommissionLedger(OrderId);
END
GO

-- =============================================
-- ALTER TABLE Sellers: add StripeCustomerId
-- =============================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Sellers' AND COLUMN_NAME = 'StripeCustomerId'
)
BEGIN
    ALTER TABLE Sellers ADD StripeCustomerId NVARCHAR(255) NULL;
END
GO
