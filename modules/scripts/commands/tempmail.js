const { http } = require("../../utils");
const sessions = new Map();

// Cleanup expired sessions every 10 min
setInterval(() => {
    const now = Date.now();
    for (const [userId, session] of sessions.entries()) {
        if (session.createdAt && now - session.createdAt > 3600000) sessions.delete(userId);
    }
}, 600000);

module.exports.config = {
    name: "tempmail", aliases: ["gen", "inbox", "read", "delete"], 
    author: "Sethdico", version: "8.1", category: "Utility", 
    description: "Temp mail boomify.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;
    if (!token) return reply("❌ APY_TOKEN missing.");

    let action = args[0]?.toLowerCase();
    const bodyText = (event.message?.text || "").toLowerCase();
    if (bodyText.includes("generate")) action = "gen";
    if (bodyText.includes("inbox")) action = "inbox";
    if (bodyText.includes("delete")) action = "delete";

    const session = sessions.get(senderID);

    if (action === "read") {
        const index = parseInt(args[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Not found.");
        const mail = session.lastMessages[index];
        return api.sendButton(`📖 **MSG:**\n${mail.body_text.substring(0, 500)}`, [{ title: "Back", payload: "tempmail inbox" }], senderID);
    }

    if (action === "inbox") {
        if (!session) return reply("⚠️ Generate first.");
        try {
            const res = await http.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, { headers: { 'apy-token': token }});
            const msgs = res.data.messages || [];
            if (!msgs.length) return api.sendButton("🔭 Empty.", [{ title: "Refresh", payload: "tempmail inbox" }], senderID);
            
            session.lastMessages = msgs;
            sessions.set(senderID, session);
            const list = msgs.slice(0, 3).map((m, i) => `[${i + 1}] ${m.from_name}`).join("\n");
            return api.sendButton(`📬 **Inbox:**\n${list}\n\nType: 'read 1'`, [{ title: "Refresh", payload: "tempmail inbox" }, { title: "Delete", payload: "tempmail delete" }], senderID);
        } catch (e) { return reply("❌ Expired."); }
    }

    if (action === "gen") {
        try {
            const res = await http.post('https://api.apyhub.com/boomlify/emails/create', {}, { headers: { 'apy-token': token }, params: { time: "1hour" }});
            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { email: data.address, id: data.id, lastMessages: [], createdAt: Date.now() });
                await api.sendButton(`📧 **Address:**\n${data.address}`, [{ title: "Inbox", payload: "tempmail inbox" }], senderID);
                return reply(data.address);
            }
        } catch (e) { return reply("❌ API Limit."); }
    }

    if (action === "delete") {
        if (session) {
            try { await http.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, { headers: { 'apy-token': token }}); } catch (e) {}
            sessions.delete(senderID);
            return reply("🗑️ Deleted.");
        }
        return reply("⚠️ No session.");
    }

    const msg = session ? `✅ **Active:**\n${session.email}` : "📧 **TEMP MAIL**";
    const buttons = session ? [{ title: "Inbox", payload: "tempmail inbox" }, { title: "Delete", payload: "tempmail delete" }] : [{ title: "Generate", payload: "tempmail gen" }];
    return api.sendButton(msg, buttons, senderID);
};
