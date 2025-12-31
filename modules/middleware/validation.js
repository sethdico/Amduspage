const { sanitize } = require('../utils/helpers');

function validateInput(req, res, next) {
    if (req.body) {
        // sanitize all text fields recursively
        const clean = (obj) => {
            if (typeof obj === 'string') return sanitize(obj);
            if (Array.isArray(obj)) return obj.map(clean);
            if (typeof obj === 'object' && obj !== null) {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    cleaned[key] = clean(value);
                }
                return cleaned;
            }
            return obj;
        };
        
        req.body = clean(req.body);
    }
    
    next();
}

function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature || !process.env.APP_SECRET) {
        return next();
    }
    
    const crypto = require('crypto');
    const hash = crypto
        .createHmac('sha256', process.env.APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (`sha256=${hash}` !== signature) {
        return res.sendStatus(403);
    }
    
    next();
}

module.exports = {
    validateInput,
    verifyWebhookSignature
};
