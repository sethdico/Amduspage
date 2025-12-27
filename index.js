require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises;
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");

const app = express();
app.set('trust proxy', 1); 

// Essential Globals
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || []);
global.PREFIX = process.env.PREFIX || ".";
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };
global.BANNED_USERS = new Set();

const loadCommands = (dir) => {
    const files = require("fs").readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (file === "cache") return; // FIX: Ignore cache folder to prevent startup crash
        if (require("fs").statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    global.client.commands.set(name, cmd);
                    if (cmd.config.aliases) cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            } catch (e) { console.error(`[Load Error] ${file}:`, e.message); }
        }
    });
};

(async () => {
    // Startup DB & Cache
    db.loadBansIntoMemory((banSet) => { global.BANNED_USERS = banSet || new Set(); });
    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    app.use(parser.json({ limit: '20mb' }));
    app.use(rateLimiter);

    app.get("/", (req, res) => res.send("🟢 Amduspage Online"));
    app.get("/webhook", (req, res) => {
        if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) res.status(200).send(req.query["hub.challenge"]);
        else res.sendStatus(403);
    });
    app.post("/webhook", (req, res) => {
        webhook.listen(req.body);
        res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
})();
