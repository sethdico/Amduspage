const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "4.3",
    category: "AI",
    description: "Gemini 3 Pro with multi image support and fallback",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    if (!cookie) return reply("no cookie found in the settings. i can't talk to gemini without it.");

    if (["clear", "reset", "forget"].includes(prompt.toLowerCase())) {
        try {
            const res = await axios.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie }
            });
            return reply(res.data.message || "memory wiped. starting fresh.");
        } catch (e) {
            return reply("couldn't clear the chat memory. the server might be lagging.");
        }
    }

    const repliedImages = event.message?.reply_to?.attachments?.filter(att => att.type === "image").map(att => att.payload.url) || [];

    if (repliedImages.length === 0 && !prompt) {
        return reply("reply to an image or just ask me something.");
    }

    if (repliedImages.length > 0 && !prompt) {
        return reply("i see the pic, but what should i do with it? give me some instructions.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const payload = {
            senderid: uid,
            message: prompt,
            cookies: { "__Secure-1PSID": cookie }
        };

        if (repliedImages.length > 0) {
            payload.urls = repliedImages;
        }

        const res = await axios.post("https://yaya-q598.onrender.com/gemini", payload);
        const answer = res.data.response;

        if (answer) {
            reply(answer);
        } else {
            reply("i blanked out. gemini didn't send anything back.");
        }

    } catch (error) {
        const errorData = error.response?.data;

        if (JSON.stringify(errorData).includes(")]}'")) {
            return reply("my gemini session expired. you can message the owner about it or just wait for him to notice and update the cookie.");
        }

        reply("i zoned out. the server is acting up or the session is dead. try again later or wait for an update.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
