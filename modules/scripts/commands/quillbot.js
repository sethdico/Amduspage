const { http } = require("../../utils");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "2.5",
    category: "AI",
    description: "AI Paraphraser",
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

        let content = res.data.response || "";
        
        // REASONING PARSER: Extracts text from the complex playground response
        if (content.includes("output_done")) {
            const match = content.match(/"text":"(.*?)"/);
            if (match) content = match[1].replace(/\\n/g, '\n');
        } else {
            content = res.data.result || res.data.message || content;
        }

        api.sendMessage(`✍️ **QUILLBOT**\n━━━━━━━━━━━━━━━━\n${content}`, event.sender.id);
    } catch (error) {
        reply("❌ Quillbot error.");
    }
};
