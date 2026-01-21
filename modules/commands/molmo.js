const axios = require("axios");

module.exports.config = {
    name: "molmo",
    author: "Sethdico",
    version: "1.0",
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

    if (!apiKey) return reply("My vision key (OPENROUTER2_KEY) is missing from the settings.");

    const getAttachment = (msg) => {
        if (!msg || !msg.attachments) return null;
        return msg.attachments.find(a => a.type === "image" || a.type === "video");
    };

    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);
    const mediaUrl = attachment?.payload?.url;
    const mediaType = attachment?.type;

    if (!prompt && !mediaUrl) {
        return reply("Send a video or image and ask me to describe it.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    const contentPayload = [
        {
            type: "text",
            text: prompt || "Describe this media in detail."
        }
    ];

    if (mediaUrl) {
        if (mediaType === "video") {
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
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "allenai/molmo-2-8b:free",
                messages: [
                    {
                        role: "user",
                        content: contentPayload
                    }
                ],
                temperature: 0.2,
                max_tokens: 1000
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/sethdico",
                    "X-Title": "Molmo Vision"
                },
                timeout: 120000 
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content;

        if (answer) {
            reply(answer);
        } else {
            reply("I watched it, but I couldn't find the words. Try again?");
        }

    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        console.error("Molmo Error:", errMsg);
        
        if (errMsg.includes("content_policy_violation")) {
            reply("I can't analyze that video content.");
        } else {
            reply("My vision is blurry right now. The server might be busy.");
        }
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
