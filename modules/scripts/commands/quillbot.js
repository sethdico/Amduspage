const { http } = require("../../utils");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "2.1",
    category: "AI",
    description: "Quillbot AI.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ");
    if (!prompt) return reply("✍️ Usage: quillbot <text>");

    try {
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai", {
             params: { prompt } 
        });

        const result = res.data.result || res.data.response || res.data.message || res.data.content;
        
        if (!result) throw new Error("Empty Response");

        api.sendMessage(`✍️ **QUILLBOT**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (error) {
        reply("❌ Quillbot error.");
    }
};
