require('dotenv').config();
const webhook = require('./webhook');
const parser = require('body-parser');
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./modules/core/database');
const rateLimiter = require('./modules/middleware/rateLimit');
const { validateInput, verifyWebhookSignature } = require('./modules/middleware/validation');
const CacheManager = require('./modules/core/cache');
const config = require('./config/config.json');
const CONSTANTS = require('./config/constants');
const mongoose = require('mongoose');

const app = express();
app.set('trust proxy', 1);

// setup globals
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(
    process.env.ADMINS ? process.env.ADMINS.split(',').filter(Boolean) : (config.ADMINS || [])
);
global.PREFIX = process.env.PREFIX || config.PREFIX || '.';
global.BOT_NAME = process.env.BOT_NAME || config.BOT_NAME || 'Amdusbot';
global.CACHE_PATH = path.join(__dirname, 'cache');
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();

// caches
global.sessions = new CacheManager(CONSTANTS.MAX_SESSIONS, CONSTANTS.ONE_HOUR);
global.userCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.ONE_DAY);
global.messageCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.SIX_HOURS);

// ensure cache dir exists
if (!fs.existsSync(global.CACHE_PATH)) {
    fs.mkdirSync(global.CACHE_PATH, { recursive: true });
}

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
            return;
        }
        
        if (!file.endsWith('.js')) return;
        
        try {
            delete require.cache[require.resolve(filePath)];
            const cmd = require(filePath);
            if (cmd.config?.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                if (cmd.config.aliases) {
                    cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            }
        } catch (e) {
            console.error(`failed to load ${file}:`, e.message);
        }
    });
}

(async () => {
    // load bans
    await new Promise(resolve => {
        db.loadBansIntoMemory((banSet) => {
            global.BANNED_USERS = banSet;
            resolve();
        });
    });
    
    // load commands
    loadCommands(path.join(__dirname, 'modules/commands'));
    console.log(`loaded ${global.client.commands.size} commands`);
    
    app.use(parser.json({ limit: '20mb' }));
    app.use(validateInput);
    app.use(rateLimiter);
    
    // routes
    app.get('/', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));
    
    app.get('/webhook', (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query['hub.verify_token'] === vToken) res.status(200).send(req.query['hub.challenge']);
        else res.sendStatus(403);
    });
    
    app.post('/webhook', verifyWebhookSignature, (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`bot running on port ${PORT}`));
})();

// prevent crashes
process.on('unhandledRejection', (err) => console.error('unhandled rejection:', err.message));
process.on('uncaughtException', (err) => console.error('uncaught exception:', err.message));
