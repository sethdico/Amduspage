const { http } = require("../../utils");

module.exports.config = { 
    name: "webpilot", 
    author: "Sethdico",
    version: "1.1",
    category: "AI", 
    description: "Search the web with AI.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5 
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("🌐 Usage: webpilot <search>");

    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", { 
            params: { search: input } 
        });
        const result = res.data.response || res.data.result || res.data.message;
        api.sendMessage(`🌐 **WEBPILOT**\n━━━━━━━━━━━━━━━━\n${result || "Empty response."}`, event.sender.id);
    } catch (e) {
        reply("❌ Webpilot error.");
    }
};
