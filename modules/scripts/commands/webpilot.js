const { http } = require("../../utils");

module.exports.config = { 
    name: "webpilot", 
    author: "Sethdico",
    version: "1.3",
    category: "AI", 
    description: "WebPilot Search AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5 
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("🌐 Usage: webpilot <query>");

    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/webcopilot", { 
            params: { question: input } 
        });
        
        // FIXED: prioritized res.data.answer
        const result = res.data.answer || res.data.response || res.data.content;
        
        api.sendMessage(`🌐 **WEBPILOT**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (e) {
        reply("❌ Webpilot search failed.");
    }
};
