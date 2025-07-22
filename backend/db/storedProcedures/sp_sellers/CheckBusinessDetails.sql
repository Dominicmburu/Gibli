USE Marketplace
GO
CREATE OR ALTER PROCEDURE CheckBusinessDetails(
    @BusinessNumber NVARCHAR(20),
    @BusinessName NVARCHAR(255)
)
AS
BEGIN 
    IF EXISTS(SELECT 1 FROM Sellers WHERE BusinessNumber=@BusinessNumber)
    BEGIN
        RAISERROR('The BusinessNumber provided is already registered, please double check and try again', 16,1)
        RETURN;
    END

    -- Check if Business Name already exists
    IF EXISTS (
        SELECT 1 FROM Sellers WHERE BusinessName = @BusinessName
    )
    BEGIN
        RAISERROR(
            'The BusinessName provided is already registered, please try a new one.',
            16, 1
        );
        RETURN;
    END
END