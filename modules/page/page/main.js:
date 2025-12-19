module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  const scripts = [
    "graph",
    "markAsSeen",
    "sendAttachment",
    "sendButton",
    "sendMessage",
    "sendTypingIndicator",
    "setMessageReaction",
  ];

  const promises = scripts.map((v) => {
    return new Promise((resolve, reject) => {
      const script = require("./src/" + v)(event);
      if (script) {
        api[v] = script;
        resolve();
      } else {
        reject(new Error(`Failed to load script: ${v}`));
      }
    });
  });

  return Promise.all(promises)
    .then(() => {
      global.api = api;
      global.PREFIX = config.PREFIX;
      global.BOTNAME = config.BOTNAME;
      
      require("./handler.js")(event);
    })
    .catch((err) => {
      console.error("Error loading scripts:", err);
      throw err;
    });
};