const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "6.0",
    category: "AI",
    description: "Quillbot Ai.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("✍️ Usage: quillbot <text>");

    try {
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai", {
             params: { prompt: input } 
        });

        let content = parseAI(res) || "";
        
        // Handle SSE "output_done" format if present
        if (content.includes("output_done")) {
            const match = content.match(/"text":"(.*?)"/);
            if (match) content = match[1].replace(/\\n/g, '\n');
        }

        api.sendMessage(`✍️ **QUILLBOT**\n━━━━━━━━━━━━━━━━\n${content || "No response."}`, event.sender.id);
    } catch (error) {
        reply("❌ Quillbot error.");
    }
};
