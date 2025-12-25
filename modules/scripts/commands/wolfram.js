const { http } = require("../../utils");

module.exports.config = {
    name: "wolfram",
    author: "Sethdico",
    version: "4.2-Fast",
    category: "Utility",
    description: "Solves math and science questions.",
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
        const response = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: {
                appid: APP_ID,
                input: input,
                output: "json",
                format: "plaintext,image",
            }
        });

        const res = response.data.queryresult;

        if (!res.success || res.error) {
            return api.sendMessage("❌ Wolfram couldn't solve that.", senderID);
        }

        let interpretation = "";
        let primaryResult = "";
        let extendedData = [];
        let images = [];

        // Parse the weird Wolfram structure
        if (res.pods) {
            for (const pod of res.pods) {
                const title = pod.title || "Info";
                const subpod = pod.subpods[0];
                const text = subpod?.plaintext;
                const imgSrc = subpod?.img?.src;

                // Collect graphs
                if (imgSrc && (title.includes("Plot") || title.includes("Graph") || title.includes("Map"))) {
                    images.push(imgSrc);
                }

                if (!text) continue;

                if (title === "Input interpretation" || title === "Input") {
                    interpretation = text;
                } else if (pod.primary || title === "Result") {
                    primaryResult = text;
                } else {
                    extendedData.push(`📍 **${title}**\n${text}`);
                }
            }
        }

        let fullReport = `🧮 **WOLFRAM**\n━━━━━━━━━━━━━━━━\n`;
        fullReport += `📥 **Q:** ${interpretation || input}\n\n`;
        fullReport += `📤 **A:**\n${primaryResult || "See details below."}\n\n`;

        if (extendedData.length > 0) {
            fullReport += `━━━━━━━━━━━━━━━━\n${extendedData.join("\n\n")}`;
        }

        await api.sendMessage(fullReport, senderID);

        // Send graphs if we found any
        if (images.length > 0) {
            for (const img of images.slice(0, 2)) {
                await api.sendAttachment("image", img, senderID);
            }
        }

    } catch (e) {
        api.sendMessage("❌ Wolfram is currently unavailable.", senderID);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
    }
};
