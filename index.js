require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs").promises;

const webhook = require("./webhook");
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");
const config = require("./config.json");

const app = express();
app.set("trust proxy", 1);

// ───────────────────────── GLOBALS ─────────────────────────
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";
global.CACHE_PATH = path.join(__dirname, "cache");

global.ADMINS = new Set(
    process.env.ADMINS
        ? process.env.ADMINS.split(",").filter(Boolean)
        : (config.ADMINS || [])
);

global.client = {
    commands: new Map(),
    aliases: new Map()
};

global.BANNED_USERS = new Set();
global.sessions = new Map();
global.userCache = new Map();

// ───────────────────────── LOGGER ─────────────────────────
global.log = {
    info: (...args) => process.env.NODE_ENV === "dev" && console.log(...args),
    debug: (...args) => process.env.DEBUG === "true" && console.log(...args),
    error: (...args) => console.error(...args)
};

// ───────────────────────── COMMAND LOADER ─────────────────────────
const loadCommands = async (dir) => {
    const entries = await require("fs").promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await loadCommands(fullPath);
            continue;
        }

        if (!entry.name.endsWith(".js")) continue;

        try {
            const cmd = require(fullPath);
            if (!cmd?.config?.name) continue;

            const name = cmd.config.name.toLowerCase();
            global.client.commands.set(name, cmd);

            if (Array.isArray(cmd.config.aliases)) {
                cmd.config.aliases.forEach(a =>
                    global.client.aliases.set(a.toLowerCase(), name)
                );
            }
        } catch (err) {
            global.log.error(`failed to load ${entry.name}:`, err.message);
        }
    }
};

// ───────────────────────── STARTUP ─────────────────────────
(async () => {
    try {
        await fs.mkdir(global.CACHE_PATH, { recursive: true });

        const files = await fs.readdir(global.CACHE_PATH);
        await Promise.all(
            files.filter(f => f !== ".gitkeep")
                .map(f => fs.unlink(path.join(global.CACHE_PATH, f)))
        );

        global.log.info("cache cleaned");
    } catch (err) {
        global.log.error("cache cleanup failed:", err.message);
    }

    await new Promise(resolve => {
        db.loadBansIntoMemory(async (banSet) => {
            global.BANNED_USERS = banSet;

            const maint = await db.getSetting("maintenance");
            const reason = await db.getSetting("maintenance_reason");

            global.MAINTENANCE_MODE = maint === "true";
            global.MAINTENANCE_REASON =
                reason || "bot is updating rn, be back soon";

            resolve();
        });
    });

    await loadCommands(path.join(__dirname, "modules/scripts/commands"));
    global.log.info(`loaded ${global.client.commands.size} commands`);

    app.use(bodyParser.json({ limit: "20mb" }));
    app.use(rateLimiter);

    app.get("/", (_, res) => res.send("🟢 bot is online"));

    app.get("/webhook", (req, res) => {
        const verifyToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query["hub.verify_token"] === verifyToken) {
            return res.status(200).send(req.query["hub.challenge"]);
        }
        res.sendStatus(403);
    });

    app.post("/webhook", (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () =>
        global.log.info(`🚀 running on port ${PORT}`)
    );
})();

// ───────────────────────── CRASH SAFETY ─────────────────────────
process.on("unhandledRejection", err => {
    console.error("unhandled rejection:", err);
});

process.on("uncaughtException", err => {
    console.error("uncaught exception:", err);
    process.exit(1);
});
