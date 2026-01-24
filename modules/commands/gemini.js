const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Jerome",
    version: "2.0",
    category: "AI",
    description: "Chat with Gemini (text + multi-image support)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply }) {
    const senderId = event.sender.id;
    const message = args.join(" ").trim();

    const GEMINI_COOKIES = {
        "__Secure-1PSID": process.env.GEMINI_COOKIE
    };

    if (message.toLowerCase() === "clear") {
        try {
            await axios.post("https://yaya-q598.onrender.com/gemini", {
                senderid: senderId,
                message: "clear",
                cookies: GEMINI_COOKIES
            }, { headers: { "Content-Type": "application/json" } });
            return reply("Conversation cleared successfully.");
        } catch (e) {
            return reply("Failed to clear conversation.");
        }
    }

    const getImages = () => {
        const current = event.message?.attachments || [];
        const replied = event.message?.reply_to?.attachments || [];
        return [...current, ...replied]
            .filter(a => a.type === "image")
            .map(a => a.payload.url);
    };

    const imageUrls = getImages();

    if (!message && imageUrls.length === 0) return reply("usage: gemini <message> or send images");

    try {
        const res = await axios.post(
            "https://yaya-q598.onrender.com/gemini",
            {
                senderid: senderId,
                message: message || "",
                cookies: GEMINI_COOKIES,
                urls: imageUrls
            },
            { headers: { "Content-Type": "application/json" }, timeout: 60000 }
        );

        if (res.data?.response) {
            reply(res.data.response);
        } else {
            reply("No response from Gemini.");
        }
    } catch (e) {
        reply("An error occurred while processing your request. Try again or type 'clear'.");
    }
};
