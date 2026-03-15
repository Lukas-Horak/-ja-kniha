// Contact form handler
// Sends email via Resend (set RESEND_API_KEY env var)
// Fallback: logs to Vercel function logs

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Vyplňte prosím všetky povinné polia.' });
        }

        // Simple email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Neplatná emailová adresa.' });
        }

        const subjectLine = subject || 'Správa z evolvium.com';
        const timestamp = new Date().toISOString();

        // Log the submission (always visible in Vercel logs)
        console.log('=== CONTACT FORM SUBMISSION ===');
        console.log(`Time: ${timestamp}`);
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Subject: ${subjectLine}`);
        console.log(`Message: ${message}`);
        console.log('===============================');

        // Try to send via Resend if API key is configured
        if (process.env.RESEND_API_KEY) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'Evolvium <info@evolvium.com>',
                        to: ['info@evolvium.com'],
                        reply_to: email,
                        subject: `[Evolvium] ${subjectLine}`,
                        html: `
                            <h3>Nová správa z evolvium.com</h3>
                            <p><strong>Meno:</strong> ${escapeHtml(name)}</p>
                            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
                            <p><strong>Predmet:</strong> ${escapeHtml(subjectLine)}</p>
                            <hr>
                            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
                            <hr>
                            <p style="color: #999; font-size: 12px;">Odoslané: ${timestamp}</p>
                        `,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    console.error('Resend error:', errData);
                }
            } catch (emailErr) {
                console.error('Email send failed:', emailErr.message);
                // Don't fail the request — the submission is still logged
            }
        }

        return res.status(200).json({ success: true, message: 'Správa bola odoslaná.' });
    } catch (error) {
        console.error('Contact form error:', error.message);
        return res.status(500).json({ error: 'Niečo sa pokazilo. Skúste to znova.' });
    }
};

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
