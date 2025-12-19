module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  
  // List of scripts to load from src/
  const scripts = [
    "markAsSeen",
    "sendMessage",
    "sendTypingIndicator", // Added
    "setMessageReaction",  // Added
    "sendAttachment"       // Added
  ];

  for (const scriptName of scripts) {
    try {
      // Load the script and pass the event to it
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
  
  // Run the handler
  require("./handler.js")(event);
};
