const { http } = require("../utils");
const db = require("../core/database");
const crypto = require("crypto");

module.exports.config = {
    name: "mimoai",
    author: "Sethdico",
    version: "5.6",
    category: "AI",
    description: "mimo ai studio scrape test",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.MIMO_STUDIO_COOKIE;

    if (!cookie) return reply(" Missing MIMO_STUDIO_COOKIE in .env");
    if (!prompt) return reply("say something.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        let history = await db.getHistory(uid) || {};
        let convoId = history.convoId || crypto.randomBytes(16).toString('hex');
        let prevMsgId = history.lastMsgId || "";

        const msgId = crypto.randomBytes(16).toString('hex');

        const payload = {
            msgId: msgId,
            conversationId: convoId,
            query: prompt,
            isEditedQuery: false,
            previousDialogueId: prevMsgId,
            modelConfig: {
                model: "mimo-v2-flash-studio", 
                enableThinking: true,
                temperature: 0.8,
                topP: 0.95,
                webSearchStatus: "enabled"
            },
            multiMedias: []
        };

        const headers = {
            "Cookie": cookie,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            "Referer": "https://aistudio.xiaomimimo.com/",
            "Origin": "https://aistudio.xiaomimimo.com",
            "X-Timezone": "Asia/Manila",
            "Accept": "*/*"
        };

        const res = await http.post("https://aistudio.xiaomimimo.com/open-apis/bot/chat?xiaomichatbot_ph=%2BK5PkbpTv5L5nG9sYVEoRw%3D%3D", payload, { headers });

        if (typeof res.data !== "string") return reply(" invalid response format.");

        const matches = [...res.data.matchAll(/"content":"(.*?)"/g)];
        let fullText = matches.map(m => m[1]).join("");

        fullText = fullText
            .replace(/\\n/g, "\n")
            .replace(/\\u0000/g, "")
            .replace(/\[DONE\]/g, "")
            .replace(/^\d+webSearch/, "")
            .trim();

        let finalAnswer = fullText;
        if (fullText.includes("</think>")) {
            finalAnswer = fullText.split("</think>")[1].trim();
        }

        if (finalAnswer) {
            reply(`📱 **Mimo Studio**\n────────────────\n${finalAnswer}`);
            await db.setHistory(uid, { convoId: convoId, lastMsgId: msgId });
        } else {
            reply(" session timed out or model refused to answer.");
        }

    } catch (e) {
        reply("connection error. go to the site and get a fresh cookie.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
