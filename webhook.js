const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs-extra");
const path = require("path");

let messagesCache = {};
const messagesFilePath = path.join(__dirname, "page/data.json");
const CACHE_LIMIT = 500;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Load cache safely
(async () => {
  if (await fs.pathExists(messagesFilePath)) {
    try { messagesCache = JSON.parse(await fs.readFile(messagesFilePath, "utf8")); } catch (e) { messagesCache = {}; }
  }
})();

// Periodic cleanup
setInterval(() => {
  const keys = Object.keys(messagesCache);
  if (keys.length > CACHE_LIMIT) {
    const toDelete = keys.slice(0, keys.length - CACHE_LIMIT);
    toDelete.forEach(key => delete messagesCache[key]);
    writeToFile();
  }
}, CLEANUP_INTERVAL);

async function writeToFile() {
  try {
    await fs.writeFile(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8");
  } catch (e) { console.error("Cache write error:", e); }
}

module.exports.listen = async function (event) {
  try {
    // Input validation
    if (!event || typeof event !== 'object') return;
    if (event.object !== "page") return;

    event.entry.forEach(async (entry) => {
      entry.messaging.forEach(async (ev) => {
        // Sanitize event
        if (!ev.sender || !ev.sender.id) return;
        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        if (ev.message && ev.message.mid && ev.message.text) {
          messagesCache[ev.message.mid] = { text: ev.message.text, attachments: ev.message.attachments };
          await writeToFile();
        }

        if (ev.type === "message_reply") {
          const repliedMid = ev.message.reply_to?.mid;
          if (repliedMid && messagesCache[repliedMid]) {
            ev.message.reply_to.text = messagesCache[repliedMid].text || null;
            ev.message.reply_to.attachments = messagesCache[repliedMid].attachments || null;
          }
        }

        if (config.selfListen && ev?.message?.is_echo) return;
        if (ev.message?.is_echo) return;

        utils.log(ev); // Sanitized logging in utils.js
        require("./page/main")(ev);
      });
    });
  } catch (error) { console.error("Webhook error:", error.message); }
};
