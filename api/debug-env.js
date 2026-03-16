module.exports = (req, res) => {
    res.json({
        hasResendKey: !!process.env.RESEND_API_KEY,
        keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : 'NOT SET',
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
    });
};
