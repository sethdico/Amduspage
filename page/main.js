require('dotenv').config();

const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises;
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");

const app = express();
const config = require("./config.json");

// 1. SECURITY FIX: Trust Render's Proxy for Rate Limiting
app.set('trust proxy', 1);

// 2. Global Configuration
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.VERIFY_TOKEN = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

global.client = { 
    commands: new Map(), 
    aliases: new Map(), 
    cooldowns: new Map() 
};

global.BANNED_USERS = new Set();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");

// 3. Startup Helpers
const initializeCache = async () => {
    try {
        console.log("🧹 Checking cache directory...");
        await fs.mkdir(cacheDir, { recursive: true });
        const files = await fs.readdir(cacheDir);
        await Promise.all(files.map(file => fs.unlink(path.join(cacheDir, file))));
        console.log("✅ Cache cleared.");
    } catch (e) {
        console.warn(`[Cache Warning] ${e.message}`);
    }
};

const loadBans = (resolve) => {
    console.log("🛡️ Connecting to ban database...");
    db.loadBansIntoMemory((banSet) => {
        global.BANNED_USERS = banSet || new Set();
        console.log(`✅ Loaded ${global.BANNED_USERS.size} banned users into memory.`);
        if (resolve) resolve(); 
    });
};

const loadCommands = (dir) => {
    console.log(`📂 Loading commands from ${dir}...`);
    
    const files = require("fs").readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        if (require("fs").statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } 
        else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    
                    global.client.commands.set(name, cmd);
                    
                    if (cmd.config.aliases) {
                        cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                    }
                    
                    console.log(`   ↳ Loaded: ${name}`);
                }
            } catch (e) { 
                console.error(`[Load Error] ${file}:`, e.message); 
            }
        }
    });
};

// 4. Main Initialization
(async () => {
    // Wait for Cache and DB before starting
    await Promise.all([initializeCache(), new Promise(r => loadBans(r))]);
    
    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    app.use(parser.json({ limit: '20mb' }));
    
    // Apply Rate Limiter
    app.use(rateLimiter);

    // Routes
    app.get("/", (req, res) => {
        res.send("🟢 Amduspage is Online and Healthy");
    });

    app.get("/webhook", (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        
        if (req.query["hub.verify_token"] === vToken) {
            console.log("✅ Webhook Verified");
            res.status(200).send(req.query["hub.challenge"]);
        } else {
            console.warn("⚠️ Webhook verification failed: Invalid Token");
            res.sendStatus(403);
        }
    });

    app.post("/webhook", (req, res) => {
        process.nextTick(() => webhook.listen(req.body));
        res.sendStatus(200);
    });

    // 5. ERROR HANDLING & CRASH ALERTS
    process.on('unhandledRejection', (reason, p) => {
        console.error('🔴 Unhandled Rejection at:', p, 'reason:', reason);
        
        // FEATURE ADDED: Crash Alert to Admins
        try {
            // Lazy load api to ensure it exists
            const api = require('./page/main').api;
            if (api && global.ADMINS && global.ADMINS.size > 0) {
                const errorText = reason instanceof Error ? reason.message : JSON.stringify(reason);
                const alertMsg = `⚠️ **SYSTEM ALERT**\n\nAn internal error occurred:\n${errorText}`;
                
                global.ADMINS.forEach(adminId => {
                    api.sendMessage(alertMsg, adminId).catch(() => {});
                });
            }
        } catch (e) {
            console.error("Failed to send crash alert to admin.");
        }
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send("Internal Server Error");
    });

    // 6. Start Server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log("=================================");
        console.log(`🚀 Server active on port ${PORT}`);
        console.log(`🤖 Loaded ${global.client.commands.size} commands.`);
        console.log("=================================");
    });
})();
