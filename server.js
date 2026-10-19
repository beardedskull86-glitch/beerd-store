import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';

const app = express();
app.disable('x-powered-by');
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const designs = ['Classic Skull', 'BEER’D Cap', 'Dance Dad', 'Clean Skull'];
const types = [
  { name: 'Graphic Tee', cents: 2800 },
  { name: 'Die-Cut Sticker', cents: 600 },
  { name: 'Coffee Mug', cents: 1800 },
  { name: 'Pullover Hoodie', cents: 4800 },
  { name: 'Tumbler', cents: 3000 },
];
const colorsByType = { 'Graphic Tee': ['Black','White','Charcoal','Navy','Heather Gray','Red'], 'Pullover Hoodie': ['Black','White','Charcoal','Navy','Heather Gray','Red'], 'Die-Cut Sticker': ['Original Black & White'], 'Coffee Mug': ['White','Black','Navy','Red'], 'Tumbler': ['Black','White','Silver','Navy'] };
const sizesByType = { 'Graphic Tee': ['S','M','L','XL','2XL','3XL'], 'Pullover Hoodie': ['S','M','L','XL','2XL','3XL'] };
const catalog = Object.fromEntries(designs.flatMap((design, di) => types.map((type, ti) => [
  `${di}-${ti}`, { name: `${design} ${type.name}`, type: type.name, unit_amount: type.cents }
])));
const origin = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '');

// Stripe must receive the unmodified raw webhook body to verify signatures.
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Not configured');
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return res.status(400).send(`Webhook error: ${error.message}`); }
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    // IMPORTANT: Connect an order database, email notification, or fulfillment provider here.
    console.info('Paid order received:', event.data.object.id);
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static('public', { extensions: ['html'] }));
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe || !origin || !/^https:\/\//.test(origin) && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) {
    return res.status(503).json({ error: 'Payments are not configured yet. The store owner must set STRIPE_SECRET_KEY and PUBLIC_SITE_URL.' });
  }
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) return res.status(400).json({ error: 'Invalid cart.' });
  const lines = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !catalog[item.id] || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) {
      return res.status(400).json({ error: 'Invalid product or quantity.' });
    }
    const product = catalog[item.id];
    if (!colorsByType[product.type].includes(item.color) || (sizesByType[product.type] ? !sizesByType[product.type].includes(item.size) : item.size != null)) return res.status(400).json({error:'Invalid product variant.'});
    const variantName = `${product.name} — ${item.color}${item.size ? ' / '+item.size : ''}`;
    lines.push({ price_data: { currency: 'usd', unit_amount: product.unit_amount, product_data: { name: variantName } }, quantity: item.qty });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items: lines,
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session creation failed:', error.message);
    res.status(502).json({ error: 'Checkout is temporarily unavailable. Please try again.' });
  }
});
app.listen(Number(process.env.PORT || 3000), () => console.log(`BEER'D store listening on port ${process.env.PORT || 3000}`));
