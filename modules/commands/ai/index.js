const { askChipp } = require("./handlers");
const { getSession } = require("./session");
const db = require("../../core/database");

module.exports.config = {
    name: "amdus",
    author: "sethdico & jerome",
    version: "24.0",
    category: "AI",
    description: "Main Amdus AI with real-time info, image recognition/generation and file generation.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const sender = event.sender.id;
    const prompt = args.join(" ").trim();
    
    const img = event.message?.attachments?.find(a => a.type === "image")?.payload?.url || 
                event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url || "";

    if (!prompt && !img) return;

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);

    try {
        let history = await db.getHistory(sender) || [];
        if (!Array.isArray(history)) history = [];

        const session = getSession(sender);
        
        const res = await askChipp(prompt, img, history.slice(-10), session);

        if (res.error) {
            return reply("⚠️ " + res.message);
        }

        if (!res.message && (!res.images || res.images.length === 0)) {
            return reply("⚠️ I received an empty response from the server.");
        }

        if (res.message) {
            await reply(res.message);
            
            history.push({ role: "user", content: prompt });
            history.push({ role: "assistant", content: res.message });
            await db.setHistory(sender, history.slice(-12));
        }

        if (res.images && res.images.length > 0) {
            for (const url of res.images) {
                await api.sendAttachment("image", url, sender);
            }
        }

    } catch (e) {
        console.error("Amdus Run Error:", e);
        reply("⚠️ Something went wrong. Please try again.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
    }
};
