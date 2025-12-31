const { http } = require("../../utils");

module.exports.config = {
    name: "wolfram", author: "Sethdico", version: "8.6", category: "Utility", description: "WolframAlpha.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const id = event.sender.id;
    if (!input) return reply("🧮 Usage: wolfram <query>");
    
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const response = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: { appid: process.env.WOLFRAM_APP_ID, input: input, output: "json", format: "plaintext,image" },
            timeout: 60000
        });

        const res = response.data.queryresult;
        if (!res.success || res.error) return reply("❌ Wolfram couldn't solve that.");

        let fullReport = `🧮 **WOLFRAM ALPHA REPORT**\n────────────────\n`;
        let images = [];
        const importantPods = ["Result", "Solution", "Decimal approximation"];

        if (res.pods) {
            res.pods.forEach(pod => {
                const isImportant = importantPods.some(ip => pod.title.includes(ip));
                pod.subpods?.forEach(sub => {
                    if (sub.plaintext && (isImportant || fullReport.length < 1500)) fullReport += `📌 **${pod.title}:**\n${sub.plaintext}\n\n`;
                    if (sub.img?.src && (pod.title.includes("Plot") || pod.title.includes("Graph"))) if (images.length < 3) images.push(sub.img.src);
                });
            });
        }

        await api.sendMessage(fullReport.trim(), id);
        for (const imgUrl of images) await api.sendAttachment("image", imgUrl, id).catch(()=>{});

    } catch (e) {
        reply("❌ Wolfram is currently unavailable.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
