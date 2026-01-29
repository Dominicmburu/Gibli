Database Tables Involved
Table	Purpose
CartItems	Stores cart items (Add to Cart)
CheckoutDrafts	Stores checkout session data before payment
Orders	Created after successful payment
OrderItems	Individual items in an order
Cart Checkout Flow (Step by Step)

1. POST /cart/additem
   └─ Saves to: CartItems table

2. GET /cart/items  
   └─ Reads from: CartItems table

3. POST /checkout/draft  (FinalizeCheckout page)
   └─ Saves to: CheckoutDrafts table
   └─ Contains: CartItemsJson, ShippingOptionsJson, ShippingAddressJson

4. POST /checkout/create-session
   └─ Reads from: CheckoutDrafts table
   └─ Creates Stripe session
   └─ Updates: CheckoutDrafts.SessionId

5. Stripe Webhook (on payment success)
   └─ Reads from: CheckoutDrafts table
   └─ Creates: Orders + OrderItems
   └─ Updates: CheckoutDrafts.IsUsed = 1
   └─ Deletes from: CartItems (clears cart)

   
Buy Now Flow (Comparison)

1. POST /checkout/buy-now  (Single endpoint does everything)
   └─ Reads product from: Products table
   └─ Reads address from: ShippingDetails table
   └─ Saves to: CheckoutDrafts table  ← Same table!
   └─ Creates Stripe session
   └─ Updates: CheckoutDrafts.SessionId

2. Stripe Webhook (same as cart)
   └─ Reads from: CheckoutDrafts table
   └─ Creates: Orders + OrderItems
   └─ Updates: CheckoutDrafts.IsUsed = 1
   └─ (No cart to clear for Buy Now)
Key Point
Both flows save to CheckoutDrafts before Stripe payment. The difference:

Cart: User builds cart over time → draft created at checkout
Buy Now: Draft created instantly from single product
The webhook processes both identically since both have the same draft structure.