const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "3.7",
    category: "AI",
    description: "Gemini 3 Pro with image analysis and fallback",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    if (!cookie) return reply("configuration error: GEMINI_COOKIE is missing.");

    if (["clear", "reset", "forget"].includes(prompt.toLowerCase())) {
        try {
            await axios.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie }
            });
            return reply("memory wiped.");
        } catch (e) {
            return reply("failed to reset context.");
        }
    }

    const images = [];
    const attachments = [
        ...(event.message?.attachments || []), 
        ...(event.message?.reply_to?.attachments || [])
    ];

    attachments.forEach(att => {
        if (att.type === "image") images.push(att.payload.url);
    });

    if (images.length > 0 && !prompt) {
        return reply("what should i do with this image? tell me your purpose.");
    }

    if (!prompt && images.length === 0) {
        return reply("what do you want to know?");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const res = await axios.post("https://yaya-q598.onrender.com/gemini", {
            senderid: uid,
            message: prompt,
            cookies: { "__Secure-1PSID": cookie },
            urls: images.length > 0 ? images : undefined
        });

        const { response, fallback } = res.data;

        if (response) {
            const modelLabel = fallback ? "flash" : "pro";
            reply(`[gemini 3 ${modelLabel}]\n\n${response}`);
        } else {
            reply("no response received.");
        }

    } catch (error) {
        if (error.response?.status === 401) {
            reply("session expired. please update the cookie.");
        } else {
            reply("the server encountered an error. try again later.");
        }
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
