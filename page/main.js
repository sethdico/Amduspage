module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  
  // Load basic API
  api.sendMessage = require("./src/sendMessage")(event);
  api.markAsSeen = require("./src/markAsSeen")(event);
  
  global.api = api;
  global.PREFIX = config.PREFIX;
  
  require("./handler.js")(event);
};
