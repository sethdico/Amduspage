const { http } = require("../utils");
const db = require("../core/database");
const crypto = require("crypto");

const MIMO_COOKIE = "serviceToken=lBp+en8jmZclRZ3zFZn3GIPb4kmgYOGhvB0cIBNd/Sku52azzvjlRCsn/eUHplqBNfxIRtTZusweNz6FGsaxYCmN1GaL/zyrc/VO7l4f1QTkJwfOufm2rngUgDeOQc3qIqfdKl/rHC9jwBhZrvCF/c0qqd4X0Wzy3Z7aHxlLXpTrBx9QDGg7mtVdtYu9SCjb5C8VRYxFBo5Cy7iQamJhbHrPpa7ziud7xXIjK4uK/SaM/j9aw8mbCdEvz3aJFJ8vUotStEudqWKAJdKJl53Skc1tSFpAU5AK8aWDi8WO5X7RlMkEgvFx2uUwGOBk8hbWu478qGmTeG0WOebabuVTcQGn2E65CotkbXJWErj3uiQ0VqhDBqvbO3OkZkB6hdh2; userId=6851668485; xiaomichatbot_ph=+K5PkbpTv5L5nG9sYVEoRw==;";

module.exports.config = {
    name: "mimoai",
    author: "Sethdico",
    version: "3.3",
    category: "AI",
    description: "mimo ai studio scrape test",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;

    if (!prompt) return reply("What's on your mind?");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        let history = await db.getHistory(uid);
        let convoId = (history && history.convoId) || crypto.randomBytes(16).toString('hex');

        // Strictly following your screenshot's payload structure
        const payload = {
            msgId: crypto.randomBytes(16).toString('hex'),
            conversationId: convoId,
            isEditedQuery: false,
            modelConfig: {
                enableThinking: false,
                temperature: 0.8,
                topP: 0.95,
                webSearchStatus: "disabled"
            },
            multiMedias: [],
            query: prompt
        };

        const headers = {
            "Cookie": MIMO_COOKIE,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            "Referer": "https://aistudio.xiaomimimo.com/",
            "Origin": "https://aistudio.xiaomimimo.com",
            "X-Timezone": "Asia/Manila",
            "Accept": "application/json, text/plain, */*"
        };

        // Note: The xiaomichatbot_ph in the URL must match your cookie's value
        const endpoint = "https://aistudio.xiaomimimo.com/open-apis/bot/chat?xiaomichatbot_ph=%2BK5PkbpTv5L5nG9sYVEoRw%3D%3D";
        
        const res = await http.post(endpoint, payload, { headers });

        let rawData = res.data;
        let cleanText = "";

        if (typeof rawData === "string") {
            const matches = [...rawData.matchAll(/"content":"(.*?)"/g)];
            if (matches.length > 0) {
                const combined = matches.map(m => m[1]).join("");
                try {
                    // This fixes the \n and other escaped characters
                    cleanText = JSON.parse(`"${combined}"`);
                } catch (e) {
                    cleanText = combined;
                }
            }
        }

        if (cleanText) {
            reply(`📱 **Mimo Studio**\n────────────────\n${cleanText}`);
            await db.setHistory(uid, { convoId: convoId });
        } else {
            reply("⚠️ Session error. Possible expired cookie or changed API structure.");
        }

    } catch (e) {
        reply("❌ Request failed. Mimo might have blocked the connection.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
