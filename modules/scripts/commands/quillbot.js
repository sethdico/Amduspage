const { http } = require("../../utils");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "2.2",
    category: "AI",
    description: "Quillbot Ai.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("✍️ Usage: quillbot <text>");

    try {
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai", {
             params: { prompt: input } 
        });
        const result = res.data.result || res.data.response || res.data.message;
        api.sendMessage(`✍️ **QUILLBOT**\n━━━━━━━━━━━━━━━━\n${result || "Empty response."}`, event.sender.id);
    } catch (error) {
        reply("❌ Quillbot error.");
    }
};
