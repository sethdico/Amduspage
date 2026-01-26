const { http } = require("../utils");

module.exports.config = {
    name: "molmo",
    author: "Sethdico",
    version: "2.0",
    category: "AI",
    description: "Molmo Vision (Images & Videos)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const senderID = event.sender.id;
    const apiKey = process.env.OPENROUTER2_KEY || process.env.OPENROUTER_KEY;

    if (!apiKey) return reply("My vision key is missing.");

    const getAttachment = (msg) => {
        if (!msg || !msg.attachments) return null;
        return msg.attachments.find(a => ["image", "video"].includes(a.type));
    };

    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);

    if (!prompt && !attachment) return reply("Send or reply to a video/image and ask me to describe it.");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    const mediaUrl = attachment?.payload?.url;
    const contentPayload = [{ type: "text", text: prompt || "Describe this media in detail." }];

    if (mediaUrl) {
        if (attachment.type === "video") {
            contentPayload.push({
                type: "video_url",
                video_url: { url: mediaUrl }
            });
        } else {
            contentPayload.push({
                type: "image_url",
                image_url: { url: mediaUrl }
            });
        }
    }

    try {
        const response = await http.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "allenai/molmo-2-8b:free",
            messages: [{ role: "user", content: contentPayload }],
            temperature: 0.2,
            max_tokens: 1000
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/sethdico/Amduspage",
                "X-Title": "AmdusBot"
            }
        });

        const answer = response.data?.choices?.[0]?.message?.content;
        reply(`👁️ **Molmo Vision**\n────────────────\n${answer || "I couldn't find the words."}`);
    } catch (error) {
        const errData = error.response?.data;
        reply(`Vision error: ${errData?.error?.message || "Connection failed"}`);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
