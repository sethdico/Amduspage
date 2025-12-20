const web = require("./website/web.js");
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");

// --- 🧹 STARTUP CLEANER (Stable V1 Logic) ---
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    }
    console.log("🧹 SYSTEM: Cache cleared on startup.");
}

// --- 🛡️ MIDDLEWARE (V2 Features) ---
// 1. Increase limit for large payloads
app.use(parser.json({ limit: '10mb' }));
app.use(express.static("website"));

// 2. Force HTTPS (Security from V2)
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// --- ROUTES ---
app.get("/", (req, res) => { web.html(res); });
app.get("/webhook", (req, res) => { web.verify(req, res); });
app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

// --- 🚨 GLOBAL ERROR HANDLER (V2 Feature) ---
app.use((err, req, res, next) => {
  console.error("🔥 Critical Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
});

app.listen(process.env.PORT || 8080, () => {
  web.log();
});
