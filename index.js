require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises;
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");
const config = require("./config.json");

const app = express();
app.set('trust proxy', 1); 

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;

if (!PAGE_ACCESS_TOKEN || !VERIFY_TOKEN) {
    console.error("🔴 CRITICAL: Page Access Token or Verify Token is missing!");
    process.exit(1);
}

global.PAGE_ACCESS_TOKEN = PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS ? process.env.ADMINS.split(",").filter(Boolean) : (config.ADMINS || []));
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";
global.CACHE_PATH = path.join(__dirname, "cache");
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();

const loadCommands = (dir) => {
    const files = require("fs").readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (require("fs").statSync(filePath).isDirectory()) return loadCommands(filePath);
        if (!file.endsWith(".js")) return;
        try {
            const cmd = require(filePath);
            if (cmd.config?.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                if (cmd.config.aliases) cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
            }
        } catch (e) { console.error(`[Load Error] ${file}:`, e.message); }
    });
};

(async () => {
    try { 
        await require('fs').promises.mkdir(global.CACHE_PATH, { recursive: true });
        const files = await fs.readdir(global.CACHE_PATH);
        for (const file of files) await fs.unlink(path.join(global.CACHE_PATH, file));
    } catch (e) {}

    db.loadBansIntoMemory(banSet => { global.BANNED_USERS = banSet; });
    
    const maintStatus = await db.getSetting("maintenance");
    global.MAINTENANCE_MODE = maintStatus === "true";

    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    app.use(parser.json({ limit: '20mb' }));
    app.use(rateLimiter);

    app.get("/", (req, res) => res.send("🟢 Amduspage System: Optimal"));
    app.get("/webhook", (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
        else res.sendStatus(403);
    });
    app.post("/webhook", (req, res) => {
        webhook.listen(req.body);
        res.sendStatus(200);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🚀 System Online on port ${PORT}`));
})();
