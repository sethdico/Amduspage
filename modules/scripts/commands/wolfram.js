const axios = require("axios");

module.exports.config = {
    name: "wolfram",
    author: "Sethdico",
    version: "4.2",
    category: "Utility",
    description: "Advanced computational engine. Deep-scans all data pods, delivers full reports via split-messaging, and attaches relevant mathematical plots or graphs.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const input = args.join(" ");
    const senderID = event.sender.id;

    if (!input) return api.sendMessage("🧮 Usage: wolfram <query>", senderID);
    
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

    const APP_ID = process.env.WOLFRAM_APP_ID;

    try {
        const url = `https://api.wolframalpha.com/v2/query`;
        
        const response = await axios.get(url, {
            params: {
                appid: APP_ID,
                input: input,
                output: "json",
                format: "plaintext,image",
            },
            timeout: 30000 
        });

        const res = response.data.queryresult;

        if (!res.success || res.error) {
            let errorMsg = "❌ Wolfram Alpha couldn't find a direct answer.";
            if (res.didyoumeans) {
                const suggestions = Array.isArray(res.didyoumeans) ? res.didyoumeans : [res.didyoumeans];
                errorMsg += `\n\n🤔 **Did you mean:**\n• ${suggestions.slice(0, 3).map(s => s.val).join("\n• ")}`;
            }
            return api.sendMessage(errorMsg, senderID);
        }

        let interpretation = "";
        let primaryResult = "";
        let extendedData = [];
        let images = [];

        if (res.pods) {
            for (const pod of res.pods) {
                const title = pod.title || "Info";
                const subpod = pod.subpods[0];
                const text = subpod?.plaintext;
                const imgSrc = subpod?.img?.src;

                if (imgSrc && (title.includes("Plot") || title.includes("Graph") || title.includes("Illustration") || title.includes("Map"))) {
                    images.push(imgSrc);
                }

                if (!text || text.trim() === "") continue;

                if (title === "Input interpretation" || title === "Input") {
                    interpretation = text;
                } else if (pod.primary || ["Result", "Decimal approximation", "Solution", "Value"].includes(title)) {
                    primaryResult = text;
                } else {
                    extendedData.push(`📍 **${title}**\n${text}`);
                }
            }
        }

        let fullReport = `🧮 **WOLFRAM KNOWLEDGE**\n━━━━━━━━━━━━━━━━\n`;
        fullReport += `📥 **Query:** ${interpretation || input}\n\n`;
        fullReport += `📤 **Primary Answer:**\n${primaryResult || "See data below."}\n\n`;

        if (extendedData.length > 0) {
            fullReport += `━━━━━━━━━━━━━━━━\n${extendedData.join("\n\n")}`;
        }

        await api.sendMessage(fullReport, senderID);

        const buttons = [
            { 
                type: "web_url", 
                url: `https://www.wolframalpha.com/input/?i=${encodeURIComponent(input)}`, 
                title: "🌐 View Full Source" 
            }
        ];
        await api.sendButton("🔗 For more details and interactive tools:", buttons, senderID);

        if (images.length > 0) {
            for (const img of images.slice(0, 2)) {
                await api.sendAttachment("image", img, senderID);
            }
        }

    } catch (e) {
        console.error("Wolfram Error:", e.message);
        api.sendMessage("❌ Wolfram Alpha is currently unavailable.", senderID);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
    }
};
