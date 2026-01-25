const { http } = require("../utils");
const db = require("../core/database");
const crypto = require("crypto");

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "8.1",
    category: "AI",
    description: "Conversational Mimo V2 Flash (website scraped) with visual and text memory.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ").trim();
    const uid = event.sender.id;
    const cookie = process.env.MIMO_STUDIO_COOKIE;
    const visionKey = process.env.OPENROUTER2_KEY || process.env.OPENROUTER_KEY;

    const attachment = event.message?.reply_to?.attachments?.find(a => ["image", "video"].includes(a.type));
    
    if (!prompt && !attachment) return reply("Hey! What's on your mind?");
    if (!cookie) return reply("⚠️ Missing cookie in .env");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        let history = await db.getHistory(uid) || [];
        if (!Array.isArray(history)) history = [];

        let visualContext = "";
        if (attachment && visionKey) {
            try {
                const content = [{ type: "text", text: "Describe this media in detail for context." }];
                const url = attachment.payload.url;
                if (attachment.type === "video") content.push({ type: "video_url", video_url: { url } });
                else content.push({ type: "image_url", image_url: { url } });

                const vRes = await http.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: "allenai/molmo-2-8b:free",
                    messages: [{ role: "user", content }],
                    temperature: 0.2
                }, { headers: { "Authorization": `Bearer ${visionKey}` } });

                visualContext = `[Visual Context: ${vRes.data?.choices?.[0]?.message?.content || "media"}]`;
            } catch (err) {}
        }

        const recentHistory = history.slice(-12); 
        const conversationString = recentHistory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Mimo'}: ${msg.content}`)
            .join("\n");

        let finalQuery = `[System: You are Mimo, a helpful and witty AI assistant. Use the conversation history for context.]\n\n[History]\n${conversationString}\n\n`;
        
        if (visualContext) finalQuery += `${visualContext}\n`;
        finalQuery += `User: ${prompt}\nMimo:`;

        const msgId = crypto.randomBytes(16).toString('hex');
        const convoId = crypto.randomBytes(16).toString('hex');

        const res = await http.post("https://aistudio.xiaomimimo.com/open-apis/bot/chat?xiaomichatbot_ph=%2BK5PkbpTv5L5nG9sYVEoRw%3D%3D", {
            msgId: msgId,
            conversationId: convoId,
            query: finalQuery, 
            isEditedQuery: false,
            previousDialogueId: "",
            modelConfig: {
                model: "mimo-v2-flash-studio", 
                enableThinking: true,
                temperature: 0.7,
                topP: 0.9,
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

        const matches = [...res.data.matchAll(/"content":"(.*?)"/g)];
        let fullText = matches.map(m => m[1]).join("")
            .replace(/\\n/g, "\n")
            .replace(/\\u0000/g, "")
            .replace(/\\"/g, '"')
            .replace(/\[DONE\]/g, "")
            .replace(/^\d+webSearch/, "")
            .trim();

        if (fullText.includes("</think>")) {
            fullText = fullText.split("</think>")[1].trim();
        }

        if (fullText) {
            reply(`📱 **Mimo Studio**\n────────────────\n${fullText}`);
            
            recentHistory.push({ role: 'user', content: visualContext ? `${visualContext} ${prompt}` : prompt });
            recentHistory.push({ role: 'model', content: fullText });
            
            await db.setHistory(uid, recentHistory);
        } else {
            reply("⚠️ Mimo is silent.");
        }

    } catch (e) {
        reply("❌ Connection error. Refresh cookie.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
