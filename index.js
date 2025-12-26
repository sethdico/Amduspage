// ==========================================
// AMDUSPAGE BOT - MAIN ENTRY POINT
// Optimized
// ==========================================

require('dotenv').config();

// 1. Import Dependencies
// We use standard 'require' for everything to keep it simple and readable
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises; // Use promises for non-blocking I/O
const db = require("./modules/database"); // Import our new database layer

// 2. Initialize App
const app = express();
const config = require("./config.json");

// ==========================================
// 3. GLOBAL CONFIGURATION
// We put these in global so commands can access them easily
// ==========================================

// Load Tokens from Environment Variables (Render secrets) or fallback to config.json
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.VERIFY_TOKEN = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;

// Setup Admins (Split by comma if string, or use Set directly)
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);

// Bot Prefix
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

// Initialize Client Storage for Commands
global.client = { 
    commands: new Map(), 
    aliases: new Map(), 
    cooldowns: new Map() 
};

// ==========================================
// 4. STARTUP TASKS
// ==========================================

// Define Paths
const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
// We don't need bannedPath anymore because we use Database!

// TASK 1: Clear Cache Folder
// We do this async so server doesn't hang on startup
const initializeCache = async () => {
    try {
        console.log("🧹 Checking cache directory...");
        await fs.mkdir(cacheDir, { recursive: true });
        const files = await fs.readdir(cacheDir);
        // Delete all files in cache to prevent old junk from piling up
        await Promise.all(files.map(file => fs.unlink(path.join(cacheDir, file))));
        console.log("✅ Cache cleared.");
    } catch (e) {
        console.warn(`[Cache Warning] ${e.message}`);
    }
};

// TASK 2: Load Bans from Database
// We replace the old file-reading method with DB method for speed and safety
const loadBans = async () => {
    console.log("🛡️ Connecting to ban database...");
    db.loadBansIntoMemory((banSet) => {
        global.BANNED_USERS = banSet;
        console.log(`✅ Loaded ${banSet.size} banned users into memory.`);
    });
};

// TASK 3: Load Commands
// We use synchronous readdir here because we MUST load commands before server starts
const loadCommands = (dir) => {
    console.log(`📂 Loading commands from ${dir}...`);
    
    const files = require("fs").readdirSync(dir); // Sync is okay for startup only
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        // If it's a folder, look inside it
        if (require("fs").statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } 
        // If it's a JS file, load it as a command
        else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                
                // Only register if it has a config with a name
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    
                    // Map the main name
                    global.client.commands.set(name, cmd);
                    
                    // Map aliases (shortcuts)
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

// ==========================================
// 5. SERVER SETUP
// ==========================================

(async () => {
    // Run startup tasks in parallel to speed up boot time
    await Promise.all([initializeCache(), new Promise(r => loadBans(r))]);
    
    // Load commands after other setup
    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    // Middleware to parse JSON bodies (increase limit for attachments)
    app.use(parser.json({ limit: '20mb' }));

    // Health Check Endpoint
    app.get("/", (req, res) => {
        res.send("🟢 Amduspage is Online and Healthy");
    });

    // WEBHOOK VERIFICATION (GET)
    // This is required by Facebook to link the webhook
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

    // WEBHOOK EVENTS (POST)
    // We process asynchronously so we can reply "200 OK" to FB immediately
    app.post("/webhook", (req, res) => {
        // Don't block the response waiting for commands to run
        process.nextTick(() => webhook.listen(req.body));
        res.sendStatus(200);
    });

    // ERROR HANDLING
    // Prevents server from crashing on unhandled promises
    process.on('unhandledRejection', (reason, p) => {
        console.error('🔴 Unhandled Rejection at:', p, 'reason:', reason);
    });

    // Express Error Handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send("Internal Server Error");
    });

    // START LISTENING
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log("=================================");
        console.log(`🚀 Server active on port ${PORT}`);
        console.log(`🤖 Loaded ${global.client.commands.size} commands.`);
        console.log("=================================");
    });
})();
