const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const {
            email,
            name,
            phone,
            address,
            city,
            zip,
            finalPrice,
            promoCode,
            influencer,
            quantity
        } = req.body;

        // Validate required fields
        if (!email || !name || !finalPrice) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the domain from the request for redirect URLs
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'JA — Evolúcia vedomia',
                        description: `Kniha od Lukáša Horáka | ${quantity || 1} ks`,
                        images: [],
                    },
                    unit_amount: finalPrice, // in cents
                },
                quantity: quantity || 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/dakujeme.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/#objednat`,
            customer_email: email,
            shipping_address_collection: {
                allowed_countries: ['SK', 'CZ'],
            },
            metadata: {
                customer_name: name,
                phone: phone || '',
                address: address || '',
                city: city || '',
                zip: zip || '',
                promo_code: promoCode || '',
                influencer: influencer || '',
            },
        });

        res.status(200).json({ sessionId: session.id });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
