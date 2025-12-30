const activeRequests = new Map();

module.exports = (req, res, next) => {
    // let facebook through without limits
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('facebookexternalhit')) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // get requests from last minute
    const recent = (activeRequests.get(ip) || []).filter(t => now - t < 60000);
    
    // block if over 100 requests per minute
    if (recent.length >= 100) {
        return res.status(429).send("slow down, too many requests");
    }
    
    // add this request to history
    recent.push(now);
    activeRequests.set(ip, recent);
    
    next();
};

// cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of activeRequests.entries()) {
        const recent = times.filter(t => now - t < 60000);
        if (recent.length === 0) {
            activeRequests.delete(ip);
        } else {
            activeRequests.set(ip, recent);
        }
    }
}, 300000);
