const { http } = require("../utils");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "4.0",
    category: "AI",
    description: "gemini 2.5 flash lite (vision + search grounded)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply }) {
    const prompt = args.join(" ").trim();
    const apiKey = process.env.POLLI_API_KEY;

    if (!apiKey) return reply("missing env key.");

    const replied = event.message?.reply_to?.attachments?.find(a => a.type === "image");

    if (!prompt && !replied) return reply("say something.");

    const content = [];
    if (prompt) content.push({ type: "text", text: prompt });
    else content.push({ type: "text", text: "describe this image" });

    if (replied) {
        content.push({ type: "image_url", image_url: { url: replied.payload.url } });
    }

    try {
        const res = await http.post("https://gen.pollinations.ai/v1/chat/completions", {
            model: "gemini-fast",
            messages: [{ role: "user", content: content }],
            tools: [{ type: "function", function: { name: "google_search" } }]
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
