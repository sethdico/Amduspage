const { http } = require("../utils");

module.exports.config = {
    name: "molmo",
    author: "Sethdico",
    version: "1.1",
    category: "AI",
    description: "Molmo2 Vision for Images and Videos",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const senderID = event.sender.id;
    const apiKey = process.env.OPENROUTER2_KEY;

    if (!apiKey) return reply("My vision key is missing.");

    const getAttachment = (msg) => {
        if (!msg || !msg.attachments) return null;
        return msg.attachments.find(a => a.type === "image" || a.type === "video");
    };

    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);
    const mediaUrl = attachment?.payload?.url;

    if (!prompt && !mediaUrl) return reply("Send a video or image and ask me to describe it.");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    const contentPayload = [{ type: "text", text: prompt || "Describe this media in detail." }];
    if (mediaUrl) {
        if (attachment.type === "video") contentPayload.push({ type: "video_url", video_url: { url: mediaUrl } });
        else contentPayload.push({ type: "image_url", image_url: { url: mediaUrl } });
    }

    try {
        const response = await http.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "allenai/molmo-2-8b:free",
            messages: [{ role: "user", content: contentPayload }],
            temperature: 0.2,
            max_tokens: 1000
        }, { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } });

        const answer = response.data?.choices?.[0]?.message?.content;
        reply(`👁️ **Molmo Vision**\n────────────────\n${answer || "I couldn't find the words."}`);
    } catch (error) {
        reply("My vision is blurry right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
