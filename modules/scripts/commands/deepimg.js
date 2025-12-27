const { http } = require("../../utils");

module.exports.config = {
    name: "deepimg",
    aliases: ["draw"],
    author: "Sethdico",
    version: "2.0",
    category: "Fun",
    description: "AI Image Generator",
    adminOnly: false,
    usePrefix: false,
    cooldown: 15,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ");
    if (!prompt) return reply("🎨 Usage: draw <prompt>");
    
    reply("🎨 Painting your request... please wait.");

    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/deepimg", {
            params: { prompt: prompt, style: "anime", size: "3:2" }
        });
        
        if (res.data.url) {
            await api.sendAttachment("image", res.data.url, event.sender.id);
        } else {
            throw new Error("No image URL");
        }
    } catch (e) {
        reply("❌ Failed to generate image.");
    }
};
