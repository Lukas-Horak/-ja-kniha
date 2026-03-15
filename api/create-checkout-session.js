const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1TBKL1B5B1tNqSGiuXvoFlVY';
const SHIPPING_RATE = 390; // €3.90 in cents

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, name, phone, quantity } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Vyplňte prosím meno a email.' });
        }

        const qty = Math.max(1, Math.min(10, parseInt(quantity) || 1));

        // Build the Checkout Session
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        const sessionParams = {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price: PRICE_ID,
                quantity: qty,
                adjustable_quantity: {
                    enabled: true,
                    minimum: 1,
                    maximum: 10,
                },
            }],
            // Shipping as a fixed-amount shipping rate
            shipping_options: [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: SHIPPING_RATE, currency: 'eur' },
                    display_name: 'Doručenie',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 2 },
                        maximum: { unit: 'business_day', value: 5 },
                    },
                },
            }, {
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: 0, currency: 'eur' },
                    display_name: 'Zadarmo (nad €50)',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 2 },
                        maximum: { unit: 'business_day', value: 5 },
                    },
                },
            }],
            // Enable customer-facing promo codes (FRIENDS20, VETRO10, etc.)
            allow_promotion_codes: true,
            // Collect shipping address
            shipping_address_collection: {
                allowed_countries: ['SK', 'CZ', 'AT', 'DE', 'PL', 'HU'],
            },
            customer_email: email,
            success_url: `${baseUrl}/dakujeme.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/checkout.html`,
            metadata: {
                customer_name: name,
                phone: phone || '',
            },
        };

        const session = await stripe.checkout.sessions.create(sessionParams);
        res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
