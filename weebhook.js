const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");

let messagesCache;

if (config.clearData) {
  messagesCache = {};
} else {
  messagesCache = JSON.parse(fs.readFileSync("./page/data.json"), "utf8");
}

const messagesFilePath = "./page/data.json";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function writeToFile() {
  try {
    const dataToWrite = JSON.stringify(messagesCache, null, 2);

    const fileStats = fs.existsSync(messagesFilePath)
      ? fs.statSync(messagesFilePath)
      : null;
    if (fileStats && fileStats.size > MAX_FILE_SIZE) {
      pruneMessagesCache();
    }

    fs.writeFileSync(messagesFilePath, dataToWrite, "utf8");
  } catch (error) {
    console.error("Error writing to file:", error);
  }
}

function pruneMessagesCache() {
  const keys = Object.keys(messagesCache);
  if (keys.length > 1000) {
    const oldestKey = keys[0];
    delete messagesCache[oldestKey];
    pruneMessagesCache();
  }
}

module.exports.listen = function (event) {
  try {
    if (event.object === "page") {
      event.entry.forEach((entry) => {
        entry.messaging.forEach(async (event) => {
          event.type = await utils.getEventType(event);

          global.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;

          if (
            event.type === "message" ||
            event.type === "message_reply" ||
            event.type === "attachments" ||
            event.type === "message_reaction"
          ) {
            const mid = event.message?.mid || event.reaction?.mid;

            if (event.type === "message" || event.type === "attachments" || "message_reply") {
              const text = event.message.text;
              const attachments = event.message.attachments;

              if (mid && text) {
                messagesCache[mid] = { text };
              }

              if (mid && attachments) {
                if (!messagesCache[mid]) messagesCache[mid] = {};
                messagesCache[mid].attachments = attachments;
              }
            }

            if (event.type === "message_reply") {
              const messageID = event.message.reply_to?.mid;
              const cachedMessage = messageID ? messagesCache[messageID] : null;

              if (event.message.reply_to) {
                event.message.reply_to.text = cachedMessage?.text || null;
                event.message.reply_to.attachments =
                  cachedMessage?.attachments || null;
              }
            }

            if (event.type === "message_reaction") {
              const cachedMessage = mid ? messagesCache[mid] : null;

              if (cachedMessage) {
                event.reaction.text = cachedMessage.text || null;
                event.reaction.attachments = cachedMessage.attachments || null;
              } else {
                event.reaction.text = null;
                event.reaction.attachments = null;
              }
            }
          }
          
          if (config.selfListen && event?.message?.is_echo) return;
          writeToFile();
          utils.log(event);

          require("./page/main")(event);
        });
      });
    }
  } catch (error) {
    console.error(error);
  }
};