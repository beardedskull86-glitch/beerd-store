# BEER'D Stripe Checkout setup

This project is a Node.js/Express store with Stripe-hosted Checkout. The existing shopping cart now sends product IDs and quantities to `/api/create-checkout-session`. The server validates products and sets prices; secret credentials never appear in public HTML.

## Run locally
1. Install Node.js 20+.
2. In the `beerd-store` folder run `npm install`.
3. Copy `.env.example` to `.env` and insert your Stripe **test** secret key from https://dashboard.stripe.com/test/apikeys.
4. Run `npm start`, then open http://localhost:3000.
5. Test checkout with Stripe's test card `4242 4242 4242 4242`, a future expiration date, and any CVC.

## Publish
Deploy this **Node.js server** to a host supporting Node (not a static-only website host). Configure environment variables `STRIPE_SECRET_KEY` and `PUBLIC_SITE_URL` (your actual HTTPS domain) in your hosting provider's secret settings. Do not commit `.env` to a repository. Use your live Stripe secret key only after testing.

## Stripe webhook
In Stripe Dashboard → Developers → Webhooks, add `https://YOUR_DOMAIN/api/stripe-webhook` and subscribe to `checkout.session.completed`. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in the hosting environment. The webhook currently **logs** paid sessions, but does not store orders, send merchant notifications, or trigger fulfillment. Add durable, idempotent order handling before launch. A browser success page is not proof of payment.

## Before taking real orders
- Replace sample prices with actual prices in **both** `server.js` and `public/index.html` (they must match).
- Set up shipping rates or shipping-inclusive pricing, applicable tax collection, refund/privacy policies, contact information, production/fulfillment, and order tracking.
- Stripe currently collects US shipping addresses and phone numbers; it does **not** charge shipping or calculate tax.
- Product color and apparel size selection are implemented and validated server-side, but inventory tracking and fulfillment are not implemented. Configure inventory and fulfillment before selling. Sticker color is fixed to the original black-and-white artwork. Colors are standard sample options, not verified supplier availability. Product previews are illustrative, not exact manufacturing mockups.
- The `Dance Dad` artwork includes Platinum Dance Company wording. Confirm rights/permission for any branded designs before sale.
- Configure Stripe payment methods in your Stripe Dashboard; Apple Pay / Google Pay appear only on eligible devices and setups.

This package is a **checkout integration starter**, not an activated payment processor. No Stripe account or live credentials have been connected.
