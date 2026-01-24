const { http } = require("../utils");
const db = require("../core/database");
const crypto = require("crypto");

const MIMO_COOKIE = "serviceToken=lBp+en8jmZclRZ3zFZn3GIPb4kmgYOGhvB0cIBNd/Sku52azzvjlRCsn/eUHplqBNfxIRtTZusweNz6FGsaxYCmN1GaL/zyrc/VO7l4f1QTkJwfOufm2rngUgDeOQc3qIqfdKl/rHC9jwBhZrvCF/c0qqd4X0Wzy3Z7aHxlLXpTrBx9QDGg7mtVdtYu9SCjb5C8VRYxFBo5Cy7iQamJhbHrPpa7ziud7xXIjK4uK/SaM/j9aw8mbCdEvz3aJFJ8vUotStEudqWKAJdKJl53Skc1tSFpAU5AK8aWDi8WO5X7RlMkEgvFx2uUwGOBk8hbWu478qGmTeG0WOebabuVTcQGn2E65CotkbXJWErj3uiQ0VqhDBqvbO3OkZkB6hdh2; userId=6851668485; xiaomichatbot_ph=+K5PkbpTv5L5nG9sYVEoRw==;";

module.exports.config = {
    name: "mimoai",
    author: "Sethdico",
    version: "3.2",
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

        const payload = {
            query: prompt,
            model: "mimo-v2",
            msgId: crypto.randomBytes(16).toString('hex'),
            conversationId: convoId,
            isEditedQuery: false,
            multiMedias: [],
            modelConfig: {
                enableThinking: true,
                temperature: 0.8,
                topP: 0.95,
                webSearchStatus: "enabled"
            }
        };

        const headers = {
            "Cookie": MIMO_COOKIE,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            "Referer": "https://aistudio.xiaomimimo.com/",
            "Origin": "https://aistudio.xiaomimimo.com",
            "X-Timezone": "Asia/Manila",
            "Accept": "*/*"
        };

        const endpoint = "https://aistudio.xiaomimimo.com/open-apis/bot/chat?xiaomichatbot_ph=%2BK5PkbpTv5L5nG9sYVEoRw%3D%3D";
        const res = await http.post(endpoint, payload, { headers });

        let rawData = res.data;
        let cleanText = "";

        if (typeof rawData === "string") {
            const matches = [...rawData.matchAll(/"content":"(.*?)"/g)];
            if (matches.length > 0) {
                const combined = matches.map(m => m[1]).join("");
                try {
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
            reply("⚠️ Response error. The session might be invalid or the model is busy.");
        }

    } catch (e) {
        console.error("Mimo Error:", e.message);
        reply("Request failed. Connection error or expired cookie.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
