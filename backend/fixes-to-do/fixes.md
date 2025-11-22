1. Sellers get emails but they also receive a list of what they are not selling.
   -Fix that by possibly checking where you send the emails and how you pass the ids. in the webhook event

2. Remember to deduct the stock of items purchased by the quantity a buyer has bought
   -Possibly by Instock - Quantity in the webhook for al items payed for, in the snapshot draft

3. Remember to check if the quantity in order summary is greater than what is in stock, if so don allow proceeding to checkout because then that snap shot will be saved with the wrong quantity.

4. Clearing the snapshots table, cron job or sql agent. To keep that table clean by deleting records fro N hours. regardless of their state

5. Deleteing a product also deletes its images from the s3 bucket else we will have a bloated bucket

6. Why cant i delete Users, it says something in the lines of

    - The DELETE statement conflicted with the REFERENCE constraint "FK_Orders_Shipping". The conflict occurred in database "Marketplace", table "dbo.Orders", column 'ShippingId'.

7. Remember to change the products to be displayed to only ever show products from verified sellers only in the 'GetProductsToDisplay' stored procedure by ALTERING THE WHERE CLAUSE TO 1
   And in the search products sp or do a global search of IsVerified = 0
