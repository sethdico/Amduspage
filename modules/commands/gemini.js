const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "5.2",
    category: "AI",
    description: "Access Gemini 3 Pro with support for multiple image analysis and conversation history.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    if (!cookie) {
        return reply("The Gemini cookie is missing from the server configuration.");
    }

    if (["clear", "reset", "forget"].includes(prompt.toLowerCase())) {
        try {
            const res = await axios.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie }
            });
            return reply("Conversation history has been successfully cleared.");
        } catch (error) {
            return reply("An error occurred while attempting to clear the conversation history.");
        }
    }

    const images = event.message?.reply_to?.attachments
        ?.filter(att => att.type === "image")
        .map(att => att.payload.url) || [];

    if (images.length > 0 && !prompt) {
        return reply("Please provide instructions or a question regarding the attached image.");
    }

    if (!prompt && images.length === 0) {
        return reply("Please provide a prompt or reply to an image with instructions.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const payload = {
            senderid: uid,
            message: prompt,
            cookies: { "__Secure-1PSID": cookie.trim() }
        };

        if (images.length > 0) {
            payload.urls = images;
        }

        const res = await axios.post("https://yaya-q598.onrender.com/gemini", payload);
        const { response, fallback } = res.data;

        if (response) {
            const modelLabel = fallback ? "Gemini 3 Flash" : "Gemini 3 Pro";
            reply(`[${modelLabel}]\n\n${response}`);
        } else {
            reply("I did not receive a response from Gemini. Please try again.");
        }

    } catch (error) {
        const errorString = JSON.stringify(error.response?.data || "");

        if (errorString.includes(")]}'")) {
            return reply("The Gemini session has expired. Please notify the administrator to update the cookie.");
        }

        reply("The server encountered an error while processing your request. Please try again later.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
