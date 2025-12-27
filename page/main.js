const path = require("path");
const fs = require("fs");
const handler = require("./handler");

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

    for (const key in tools) {
        api[key] = tools[key](event);
    }

    global.api = api; 

    try {
        await handler(event, api);
    } catch (e) {
        console.error("Handler Logic Error:", e);
    }
};
