const { http } = require("../utils");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "6.0",
    category: "AI",
    description: "Gemini 3 Pro",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    if (!cookie) return reply("missing cookie in config.");

    if (["clear", "reset"].includes(prompt.toLowerCase())) {
        try {
            await http.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie }
            });
            return reply("history cleared.");
        } catch (e) {
            return reply("failed to clear.");
        }
    }

    const getImages = () => {
        const current = event.message?.attachments || [];
        const replied = event.message?.reply_to?.attachments || [];
        return [...current, ...replied]
            .filter(a => a.type === "image")
            .map(a => a.payload.url);
    };

    const images = getImages();

    if (images.length > 0 && !prompt) return reply("add a caption.");
    if (!prompt && images.length === 0) return reply("say something.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const payload = {
            senderid: uid,
            message: prompt,
            cookies: { "__Secure-1PSID": cookie.trim() }
        };

        if (images.length > 0) payload.urls = images;

        const res = await http.post("https://yaya-q598.onrender.com/gemini", payload);
        
        if (res.data?.response) {
            reply(res.data.response);
        } else {
            reply("no response.");
        }

    } catch (error) {
        reply("server error.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
