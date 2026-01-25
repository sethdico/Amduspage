const { http } = require("../utils");
const db = require("../core/database");
const crypto = require("crypto");

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "6.4",
    category: "AI",
    description: "experimental Mimo V2 Flash with visual rag and conversational memory.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.MIMO_STUDIO_COOKIE;
    const visionKey = process.env.OPENROUTER2_KEY || process.env.OPENROUTER_KEY;

    const getAttachment = (m) => m?.attachments?.find(a => ["image", "video"].includes(a.type));
    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);

    if (!prompt && !attachment) return reply("say something.");
    if (!cookie) return reply("missing cookie in .env");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const history = await db.getHistory(uid) || {};
        const convoId = history.convoId || crypto.randomBytes(16).toString('hex');
        const prevMsgId = history.lastMsgId || "";
        let visualDescription = "";

        if (attachment && visionKey) {
            try {
                const content = [{ type: "text", text: "describe this media in detail for context." }];
                const url = attachment.payload.url;
                if (attachment.type === "video") content.push({ type: "video_url", video_url: { url } });
                else content.push({ type: "image_url", image_url: { url } });

                const vRes = await http.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: "allenai/molmo-2-8b:free",
                    messages: [{ role: "user", content }],
                    temperature: 0.2
                }, { headers: { "Authorization": `Bearer ${visionKey}` } });

                visualDescription = vRes.data?.choices?.[0]?.message?.content || "";
            } catch (err) {}
        }

        let finalPrompt = "Always reply in English. " + prompt;
        
        if (visualDescription) {
            finalPrompt = `[VISUAL CONTEXT: ${visualDescription}]\n\nAlways reply in English. User Question: ${prompt || "Analyze this."}`;
        }

        const msgId = crypto.randomBytes(16).toString('hex');
        const endpoint = "https://aistudio.xiaomimimo.com/open-apis/bot/chat?xiaomichatbot_ph=%2BK5PkbpTv5L5nG9sYVEoRw%3D%3D";

        const res = await http.post(endpoint, {
            msgId: msgId,
            conversationId: convoId,
            query: finalPrompt,
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
        }, {
            headers: {
                "Cookie": cookie,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
                "Referer": "https://aistudio.xiaomimimo.com/",
                "Origin": "https://aistudio.xiaomimimo.com",
                "X-Timezone": "Asia/Manila"
            }
        });

        if (typeof res.data !== "string") return reply("invalid response.");

        const matches = [...res.data.matchAll(/"content":"(.*?)"/g)];
        let fullText = matches.map(m => m[1]).join("")
            .replace(/\\n/g, "\n")
            .replace(/\\u0000/g, "")
            .replace(/\[DONE\]/g, "")
            .replace(/^\d+webSearch/, "")
            .trim();

        if (fullText.includes("</think>")) {
            fullText = fullText.split("</think>")[1].trim();
        }

        if (fullText) {
            reply(`📱 **Mimo Studio**\n────────────────\n${fullText}`);
            await db.setHistory(uid, { convoId, lastMsgId: msgId });
        } else {
            reply("session error.");
        }

    } catch (e) {
        reply("❌ connection error. check cookie.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
