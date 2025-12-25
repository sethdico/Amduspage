const { http } = require("../../utils");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "2.0-Fast",
    category: "AI",
    description: "Paraphrase text.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("⚠️ Send text to rephrase.", event.sender.id);

    try {
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai", {
             params: { prompt } 
        });

        // The API returns a message or result
        const reply = res.data.result || res.data.message;
        api.sendMessage(`✍️ **Quillbot**\n━━━━━━━━━━━━━━━━\n${reply}`, event.sender.id);

    } catch (error) {
        api.sendMessage("❌ Quillbot error.", event.sender.id);
    }
};
