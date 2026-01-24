const { http } = require("../utils");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "1.0",
    category: "AI",
    description: "gemini 2.5 flash lite",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply }) {
    const prompt = args.join(" ").trim();
    const apiKey = process.env.POLLI_API_KEY;

    if (!apiKey) return reply("missing env key.");

    const replied = event.message?.reply_to?.attachments?.find(a => a.type === "image");

    if (!replied) return reply("reply to an image.");
    if (!prompt) return reply("add a caption.");

    try {
        const res = await http.post("https://gen.pollinations.ai/v1/chat/completions", {
            model: "gemini-fast",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: replied.payload.url } }
                ]
            }]
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const answer = res.data?.choices?.[0]?.message?.content;
        reply(answer || "no response.");

    } catch (e) {
        reply("api error.");
    }
};
