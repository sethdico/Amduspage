const axios = require('axios');
const https = require('https');
const CONSTANTS = require('../../config/constants');

const requestCache = new Map();

// cleanup cache every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CONSTANTS.ONE_HOUR) {
            requestCache.delete(key);
        }
    }
}, CONSTANTS.CLEANUP_INTERVAL);

const http = axios.create({
    timeout: 60000,
    httpsAgent: new https.Agent({ 
        keepAlive: true, 
        rejectUnauthorized: false 
    }),
    headers: { 'User-Agent': 'Amduspage/Bot' },
    maxRedirects: 3,
    maxContentLength: 50 * 1024 * 1024,
    validateStatus: status => status < 500
});

// add retry interceptor
http.interceptors.response.use(
    response => response,
    async error => {
        const config = error.config;
        
        if (!config || !config.retry) {
            config.retry = 0;
        }
        
        config.retry += 1;
        
        if (config.retry <= CONSTANTS.MAX_RETRIES && error.response?.status >= 500) {
            await new Promise(r => setTimeout(r, CONSTANTS.RETRY_DELAY * config.retry));
            return http(config);
        }
        
        return Promise.reject(error);
    }
);

async function cachedRequest(url, options = {}, cacheTime = 60000) {
    const key = `${url}:${JSON.stringify(options)}`;
    
    if (requestCache.has(key)) {
        const cached = requestCache.get(key);
        if (Date.now() - cached.timestamp < cacheTime) {
            return cached.response;
        }
    }
    
    const response = await http(url, options);
    requestCache.set(key, { response, timestamp: Date.now() });
    
    return response;
}

module.exports = {
    http,
    cachedRequest
};
