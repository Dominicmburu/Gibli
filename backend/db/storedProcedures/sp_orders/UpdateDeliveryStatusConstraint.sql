USE Marketplace;
GO

-- Drop the existing CHECK constraint on DeliveryStatus
-- The constraint name may vary, so find it dynamically
DECLARE @ConstraintName NVARCHAR(200);

SELECT @ConstraintName = dc.name
FROM sys.check_constraints dc
INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE c.name = 'DeliveryStatus' AND OBJECT_NAME(dc.parent_object_id) = 'Orders';

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Orders DROP CONSTRAINT ' + @ConstraintName);
    PRINT 'Dropped constraint: ' + @ConstraintName;
END

-- Add the updated constraint with new statuses
ALTER TABLE Orders
ADD CONSTRAINT CK_Orders_DeliveryStatus
CHECK (DeliveryStatus IN ('Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'));
GO

PRINT 'New DeliveryStatus constraint created with: Processing, Confirmed, Shipped, Delivered, Cancelled, Rejected';
GO
