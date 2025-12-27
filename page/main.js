const path = require("path");
const fs = require("fs");
const handler = require("./handler");

// Dynamically load every tool in the /src folder
const srcPath = path.join(__dirname, "src");
const tools = {};

fs.readdirSync(srcPath).forEach(file => {
    if (file.endsWith(".js")) {
        const name = path.parse(file).name;
        tools[name] = require(`./src/${file}`);
    }
});

module.exports = async function (event) {
    const api = {};

    // Bind every tool (sendMessage, sendQuickReply, etc.) to this specific event
    for (const key in tools) {
        api[key] = tools[key](event);
    }

    // Set a global fallback just in case some commands use it, 
    // but the handler uses the local 'api' passed below.
    global.api = api; 

    try {
        await handler(event, api);
    } catch (e) {
        console.error("[Fatal Handler Error]:", e);
    }
};
