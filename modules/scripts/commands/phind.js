const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "phind", author: "Sethdico", version: "6.0", category: "AI", description: "Phind AI.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🔎 Usage: phind <query>");

    try {
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/phindai", { 
            params: { q: query } 
        });
        const result = parseAI(res);
        api.sendMessage(`🔎 **PHIND**\n━━━━━━━━━━━━━━━━\n${result || "No response."}`, event.sender.id);
    } catch (e) {
        reply("❌ Phind error.");
    }
};
