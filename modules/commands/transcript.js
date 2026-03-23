const { http } = require("../utils");

module.exports.config = {
    name: "transcript",
    author: "sethdico",
    category: "Admin",
    description: "view the full conversation history of a specific amdus ai session.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ args, api, reply }) {
    const sid = args[0];

    if (!sid) {
        return reply("📜 **transcript tool**\n━━━━━━━━━━━━━━━━\nhow to use:\n  transcript <session_id>\n\nexample:\n  transcript 550e8400-e29b-41d4-a716-446655440000\n\nnote: you can get session ids by clicking 'view chat' in the getuser command.");
    }

    if (sid === "null" || sid === "undefined") {
        return reply("this user doesn't have a valid session id yet.");
    }

    try {
        const res = await http.get(`https://app.chipp.ai/api/v1/chat/transcript/${sid}`, {
            headers: { "Authorization": `Bearer ${process.env.CHIPP_API_KEY}` }
        });

        const data = res.data;
        if (!data.messages || data.messages.length === 0) {
            return reply("the transcript is empty.");
        }

        let report = `📜 **chat log: ${data.title || "active session"}**\n`;
        report += `total messages: ${data.messageCount}\n`;
        report += `━━━━━━━━━━━━━━━━\n\n`;

        data.messages.forEach(m => {
            const icon = m.role === "user" ? "👤" : "🤖";
            report += `${icon} ${m.role}: ${m.content}\n\n`;
        });

        await api.sendMessage(report.toLowerCase(), "me");
    } catch (e) {
        reply("failed to fetch chat log. the session might be expired or the id is wrong.");
    }
};
