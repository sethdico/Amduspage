const { http } = require("../../utils");

module.exports.config = {
    name: "phind",
    author: "Sethdico",
    version: "1.0",
    category: "AI",
    description: "Phind AI Search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🔎 Usage: phind <query>");

    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/phind", { 
            params: { q: query } 
        });
        
        // Extracting string from result as shown in your playground
        const result = typeof res.data === 'string' ? res.data : (res.data.result || res.data.response);
        
        api.sendMessage(`🔎 **PHIND**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (e) {
        reply("❌ Phind is unavailable.");
    }
};
