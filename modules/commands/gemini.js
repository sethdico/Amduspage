const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "4.0",
    category: "AI",
    description: "Gemini 3 Pro with multi-image vision support",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    if (!cookie) return reply("cookie's missing.");

    if (["clear", "reset", "forget"].includes(prompt.toLowerCase())) {
        try {
            await axios.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie }
            });
            return reply("memory wiped.");
        } catch (e) {
            return reply("failed to reset.");
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
        return reply("what's on your mind?");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const payload = {
            senderid: uid,
            message: prompt,
            cookies: { "__Secure-1PSID": cookie }
        };

        if (images.length > 0) {
            payload.urls = images;
        }

        const res = await axios.post("https://yaya-q598.onrender.com/gemini", payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 60000
        });

        const { response, fallback, model } = res.data;

        if (response) {
            const status = fallback ? "flash" : "pro";
            reply(`[gemini 3 ${status}]\n\n${response}`);
        } else {
            reply("got no response. try again.");
        }

    } catch (error) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        console.error("Gemini Error Detail:", errorData || error.message);

        if (status === 401 || (errorData && JSON.stringify(errorData).includes("cookie"))) {
            return reply("session expired. need a new cookie.");
        }
        
        if (status === 400) {
            return reply("invalid request. maybe the image is unreadable.");
        }

        reply("the server encountered an error. try again later.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
