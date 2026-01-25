const { http } = require("../utils");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "8.0",
    category: "AI",
    description: "gemini 3 pro with multi-image support and automatic flash fallback.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.GEMINI_COOKIE;

    const getImages = () => {
        const current = event.message?.attachments || [];
        const replied = event.message?.reply_to?.attachments || [];
        return [...current, ...replied]
            .filter(a => a.type === "image")
            .map(a => a.payload.url);
    };

    const images = getImages();

    if (!prompt && images.length === 0) return reply("say something.");
    if (!cookie) return reply("missing cookie in .env");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    if (prompt.toLowerCase() === "clear") {
        try {
            await http.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie.trim() }
            });
            return reply("history cleared.");
        } catch (e) {
            return reply("failed to clear.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        }
    }

    try {
        const res = await http.post("https://yaya-q598.onrender.com/gemini", {
            senderid: uid,
            message: prompt || "describe this",
            cookies: { "__Secure-1PSID": cookie.trim() },
            urls: images
        }, { timeout: 60000 });

        const data = res.data;

        if (data?.response) {
            const modelName = data.fallback ? "Gemini Flash" : "Gemini 3 Pro";
            reply(`✨ **${modelName}**\n────────────────\n${data.response}`);
        } else {
            reply("no response.");
        }

    } catch (error) {
        reply("server error.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
