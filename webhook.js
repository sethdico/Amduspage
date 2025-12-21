const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");
const path = require("path");

let messagesCache = {};
const messagesFilePath = path.join(__dirname, "page/data.json");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

let saveTimer = null;

// Load cache safely
if (fs.existsSync(messagesFilePath)) {
  try {
    messagesCache = JSON.parse(fs.readFileSync(messagesFilePath, "utf8"));
  } catch (e) {
    messagesCache = {};
  }
}

// Function to save message cache without lagging the bot
function triggerSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(messagesCache);
      if (keys.length > 500) {
        const toDelete = keys.slice(0, keys.length - 500);
        toDelete.forEach(key => delete messagesCache[key]);
      }
      fs.writeFile(messagesFilePath, JSON.stringify(messagesCache, null, 2), 'utf8', (err) => {
        if (err) console.error("⚠️ Cache Save Error:", err.message);
      });
    } catch (e) {
      console.error("Cache Logic Error:", e.message);
    }
  }, 5000);
}

module.exports.listen = function (event) {
  try {
    if (!event || typeof event !== 'object' || event.object !== "page") return;

    // Load fresh banned list for every batch of messages
    let bannedList = [];
    if (fs.existsSync(bannedPath)) {
      try {
        bannedList = JSON.parse(fs.readFileSync(bannedPath));
      } catch (e) {
        bannedList = [];
      }
    }

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        if (!ev.sender || !ev.sender.id) return;

        // 🚫 BAN CHECK: If user is in banned.json, stop here.
        if (bannedList.includes(ev.sender.id)) {
          return;
        }

        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        // Cache Logic for replies
        if (ev.message && ev.message.mid) {
          messagesCache[ev.message.mid] = {
            text: ev.message.text,
            attachments: ev.message.attachments
          };
          triggerSave();
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

        utils.log(ev);
        require("./page/main")(ev);
      });
    });
  } catch (error) {
    console.error("Webhook Logic Error:", error.message);
  }
};
