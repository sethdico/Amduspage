const fs = require("fs");
const path = require("path");

module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  
  // ✅ DYNAMIC LOADER: Scans the folder so you never have to edit this list again
  const srcPath = path.join(__dirname, "src");
  const scripts = fs.readdirSync(srcPath).filter(file => file.endsWith(".js"));

  for (const file of scripts) {
    try {
      const scriptName = path.parse(file).name;
      const loadedScript = require(`./src/${file}`);
      if (typeof loadedScript === "function") {
        api[scriptName] = loadedScript(event);
      }
    } catch (e) {
      console.error(`❌ Failed to load API script: ${file}`, e);
    }
  }
  
  global.api = api;
  global.PREFIX = config.PREFIX;
  
  require("./handler.js")(event);
};
