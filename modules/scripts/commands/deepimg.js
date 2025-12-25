const { http } = require("../../utils");

module.exports.config = {
    name: "deepimg",
    aliases: ["draw"],
    author: "Sethdico",
    version: "1.2-Fast",
    category: "Fun",
    description: "Generate Anime Image.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 15,
};

module.exports.run = async function ({ event, args, api }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("🎨 Usage: draw <text>", event.sender.id);

    api.sendMessage("🎨 Painting...", event.sender.id);
    
    try {
        const url = `https://shin-apis.onrender.com/ai/deepimg?prompt=${encodeURIComponent(prompt)}&style=anime`;
        const res = await http.get(url);
        
        if (res.data.url) {
            await api.sendAttachment("image", res.data.url, event.sender.id);
        } else {
            throw new Error("No image");
        }
    } catch (e) {
        api.sendMessage("❌ Failed to generate image.", event.sender.id);
    }
};
