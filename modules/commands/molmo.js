const axios = require("axios");
const { http } = require("../utils");

const processedMids = new Set();
setInterval(() => processedMids.clear(), 60000);

module.exports.config = {
    name: "molmo",
    author: "sethdico",
    version: "9.0",
    category: "AI",
    description: "multimodal reasoning agent. uses molmo-2-8b via openrouter for advanced vision analysis and exa ai for live web verification. capable of identifying subjects like insects, academic problems, or commercial products and confirming details with real-time data.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const mid = event.message?.mid;
    if (mid && processedMids.has(mid)) return;
    if (mid) processedMids.add(mid);

    const prompt = args.join(" ").trim();
    const senderID = event.sender.id;
    const visionKey = process.env.OPENROUTER2_KEY;
    const exaKey = process.env.EXA_API_KEY;

    if (!visionKey || !exaKey) return reply("api keys missing in env.");

    const getAttachment = (msg) => {
        if (!msg || !msg.attachments) return null;
        return msg.attachments.find(a => ["image", "video"].includes(a.type));
    };

    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);

    if (!prompt && !attachment) return reply("provide a query or media to investigate.");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        let visualData = null;

        if (attachment) {
            const url = attachment.payload.url;
            const visionPrompt = "identify the main subject and user intent in this media. is it a biological specimen, a math/school problem, a commercial product, or a specific scene? list unique features, text, or brand names found. be rational and precise.";
            const content = [{ type: "text", text: visionPrompt }];

            if (attachment.type === "video") {
                content.push({ type: "text", text: `analyze this video link: ${url}` });
            } else {
                content.push({ type: "image_url", image_url: { url } });
            }

            const molmoRes = await http.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content }]
            }, {
                headers: { "Authorization": `Bearer ${visionKey}` }
            });

            const analysis = molmoRes.data?.choices?.[0]?.message?.content || "";
            visualData = {
                raw: analysis,
                subject: analysis.split(/[.:\n]/)[0].toLowerCase()
            };
        }

        let exaQuery = prompt;
        if (visualData) {
            exaQuery = `visual reasoning: ${visualData.raw}. user query: ${prompt || "investigate this subject and provide a verified outcome."}`;
        }

        const exaRes = await axios.post("https://api.exa.ai/answer", {
            query: exaQuery,
            stream: false
        }, {
            headers: { "x-api-key": exaKey, "Content-Type": "application/json" }
        });

        const exaAnswer = exaRes.data.answer;
        const sources = exaRes.data.citations?.length > 0 
            ? "\n\nsources:\n" + exaRes.data.citations.map(c => `- ${c}`).join("\n") 
            : "";

        let response = "";
        if (visualData) {
            response = `👁️ **molmo x exa**\n────────────────\nsubject: ${visualData.subject}\ni analyzed the media and identified the subject. searching the web for a verified outcome:\n\n${exaAnswer || visualData.raw}${sources}`;
        } else {
            response = `🔍 **exa search**\n────────────────\n${exaAnswer}${sources}`;
        }

        reply(response.toLowerCase());

    } catch (e) {
        reply("analysis failed. check logs.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
