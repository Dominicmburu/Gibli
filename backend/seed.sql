USE [Marketplace];
GO

-- ============================================================
-- SEED DATA — run this once after script.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SUBSCRIPTION PLANS
--    Must match planId / planCode in SellerSubscription.jsx
-- ─────────────────────────────────────────────────────────────
SET IDENTITY_INSERT [dbo].[SubscriptionPlans] ON;

MERGE [dbo].[SubscriptionPlans] AS target
USING (VALUES
    (1, 'Free Plan',        'free',             0.00,    0.0500, 'none',    'Default plan. No monthly fee, 5% commission per sale.', 1),
    (2, 'Standard Annual',  'standard_yearly',  100.00,  0.0300, 'yearly',  'Annual plan with reduced 3% commission.', 1),
    (3, 'Monthly Pro',      'monthly',          10.00,   0.0300, 'monthly', 'Monthly plan with reduced 3% commission.', 1),
    (4, 'Premium Annual',   'premium_yearly',   6000.00, 0.0000, 'yearly',  'Enterprise plan. Zero commission on all sales.', 1)
) AS source (PlanId, PlanName, PlanCode, Price, CommissionRate, BillingCycle, Description, IsActive)
ON target.PlanId = source.PlanId
WHEN MATCHED THEN UPDATE SET
    PlanName       = source.PlanName,
    PlanCode       = source.PlanCode,
    Price          = source.Price,
    CommissionRate = source.CommissionRate,
    BillingCycle   = source.BillingCycle,
    Description    = source.Description,
    IsActive       = source.IsActive
WHEN NOT MATCHED THEN INSERT
    (PlanId, PlanName, PlanCode, Price, CommissionRate, BillingCycle, Description, IsActive)
VALUES
    (source.PlanId, source.PlanName, source.PlanCode, source.Price,
     source.CommissionRate, source.BillingCycle, source.Description, source.IsActive);

SET IDENTITY_INSERT [dbo].[SubscriptionPlans] OFF;
GO

-- ─────────────────────────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────────────────────────
MERGE [dbo].[Categories] AS target
USING (VALUES
    ('cat-electronics',   'Electronics'),
    ('cat-fashion',       'Fashion & Clothing'),
    ('cat-home',          'Home & Garden'),
    ('cat-beauty',        'Beauty & Health'),
    ('cat-sports',        'Sports & Outdoors'),
    ('cat-books',         'Books & Media'),
    ('cat-toys',          'Toys & Games'),
    ('cat-automotive',    'Automotive'),
    ('cat-food',          'Food & Groceries'),
    ('cat-art',           'Art & Collectibles')
) AS source (CategoryId, CategoryName)
ON target.CategoryId = source.CategoryId
WHEN NOT MATCHED THEN INSERT (CategoryId, CategoryName)
VALUES (source.CategoryId, source.CategoryName);
GO

-- ─────────────────────────────────────────────────────────────
-- 3. SUB-CATEGORIES
-- ─────────────────────────────────────────────────────────────
MERGE [dbo].[SubCategories] AS target
USING (VALUES
    -- Electronics
    ('sub-phones',          'cat-electronics',  'Phones & Accessories'),
    ('sub-laptops',         'cat-electronics',  'Laptops & Computers'),
    ('sub-audio',           'cat-electronics',  'Audio & Headphones'),
    ('sub-cameras',         'cat-electronics',  'Cameras & Photography'),
    ('sub-gaming',          'cat-electronics',  'Gaming'),
    ('sub-tv',              'cat-electronics',  'TVs & Displays'),
    -- Fashion
    ('sub-mens',            'cat-fashion',      'Men''s Clothing'),
    ('sub-womens',          'cat-fashion',      'Women''s Clothing'),
    ('sub-kids-fashion',    'cat-fashion',      'Kids'' Clothing'),
    ('sub-shoes',           'cat-fashion',      'Shoes & Footwear'),
    ('sub-bags',            'cat-fashion',      'Bags & Accessories'),
    ('sub-watches',         'cat-fashion',      'Watches & Jewellery'),
    -- Home & Garden
    ('sub-furniture',       'cat-home',         'Furniture'),
    ('sub-kitchen',         'cat-home',         'Kitchen & Dining'),
    ('sub-bedding',         'cat-home',         'Bedding & Bath'),
    ('sub-garden',          'cat-home',         'Garden & Outdoor'),
    ('sub-lighting',        'cat-home',         'Lighting'),
    ('sub-storage',         'cat-home',         'Storage & Organisation'),
    -- Beauty & Health
    ('sub-skincare',        'cat-beauty',       'Skincare'),
    ('sub-haircare',        'cat-beauty',       'Hair Care'),
    ('sub-makeup',          'cat-beauty',       'Makeup & Cosmetics'),
    ('sub-vitamins',        'cat-beauty',       'Vitamins & Supplements'),
    ('sub-fragrances',      'cat-beauty',       'Fragrances'),
    -- Sports
    ('sub-fitness',         'cat-sports',       'Fitness & Gym'),
    ('sub-outdoor',         'cat-sports',       'Outdoor & Camping'),
    ('sub-cycling',         'cat-sports',       'Cycling'),
    ('sub-watersports',     'cat-sports',       'Water Sports'),
    ('sub-team-sports',     'cat-sports',       'Team Sports'),
    -- Books & Media
    ('sub-books',           'cat-books',        'Books'),
    ('sub-music',           'cat-books',        'Music & Vinyl'),
    ('sub-movies',          'cat-books',        'Movies & TV'),
    ('sub-videogames',      'cat-books',        'Video Games'),
    -- Toys & Games
    ('sub-kids-toys',       'cat-toys',         'Kids'' Toys'),
    ('sub-board-games',     'cat-toys',         'Board Games'),
    ('sub-puzzles',         'cat-toys',         'Puzzles'),
    ('sub-outdoor-toys',    'cat-toys',         'Outdoor Play'),
    -- Automotive
    ('sub-car-parts',       'cat-automotive',   'Car Parts'),
    ('sub-car-accessories', 'cat-automotive',   'Car Accessories'),
    ('sub-tools',           'cat-automotive',   'Tools & Equipment'),
    -- Food
    ('sub-fresh',           'cat-food',         'Fresh Produce'),
    ('sub-snacks',          'cat-food',         'Snacks & Confectionery'),
    ('sub-drinks',          'cat-food',         'Drinks & Beverages'),
    ('sub-organic',         'cat-food',         'Organic & Natural'),
    -- Art
    ('sub-paintings',       'cat-art',          'Paintings & Prints'),
    ('sub-photography-art', 'cat-art',          'Photography'),
    ('sub-handmade',        'cat-art',          'Handmade & Crafts'),
    ('sub-antiques',        'cat-art',          'Antiques & Vintage')
) AS source (SubCategoryId, CategoryId, SubCategoryName)
ON target.SubCategoryId = source.SubCategoryId
WHEN NOT MATCHED THEN INSERT (SubCategoryId, CategoryId, SubCategoryName)
VALUES (source.SubCategoryId, source.CategoryId, source.SubCategoryName);
GO

PRINT 'Seed data inserted successfully.';
GO
