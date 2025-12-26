const fs = require("fs");
const path = require("path");

const tools = {}; 
const srcPath = path.join(__dirname, "src");

// Load API wrappers once
try {
    fs.readdirSync(srcPath).filter(f => f.endsWith(".js")).forEach(file => {
        const name = path.parse(file).name;
        tools[name] = require(`./src/${file}`);
    });
} catch (e) {
    console.error("Error loading API tools:", e);
}

module.exports = async function (event) {
    // Create specific API instance for this request
    const api = {};

    for (const key in tools) {
        api[key] = tools[key](event);
    }

    // Fallback for background tasks (like reminders)
    global.api = api; 
    
    // Pass specific api to handler to prevent race conditions
    require("./handler.js")(event, api);
};
