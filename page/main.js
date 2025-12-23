module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  
  // REGISTER ALL SCRIPTS
  const scripts = [
    "markAsSeen",
    "sendMessage",
    "sendTypingIndicator",
    "setMessageReaction",
    "sendAttachment",
    "sendButton",
    // NEW ONES:
    "sendQuickReply",
    "sendCarousel",
    "getUserInfo"
  ];

  for (const scriptName of scripts) {
    try {
      // Standardize loading
      const loadedScript = require(`./src/${scriptName}`);
      if (typeof loadedScript === "function") {
        api[scriptName] = loadedScript(event);
      }
    } catch (e) {
      console.error(`Failed to load API script: ${scriptName}`, e);
    }
  }
  
  global.api = api;
  global.PREFIX = config.PREFIX;
  
  require("./handler.js")(event);
};
