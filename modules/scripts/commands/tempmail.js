const http = require("../../utils");

const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    aliases: ["generate", "inbox", "check", "clear"], 
    author: "Sethdico",
    version: "5.0-Fast",
    category: "Utility",
    description: "Disposable email.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN missing.");

    // Auto-cleanup sessions if they get too big (Prevent Memory Leak)
    if (sessions.size > 100) {
        const keys = [...sessions.keys()];
        for(let i=0; i<20; i++) sessions.delete(keys[i]);
    }

    const fullText = (event.message?.text || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    if (fullText.includes("generate")) action = "gen";
    if (fullText.includes("inbox") || fullText.includes("check")) action = "inbox";
    if (fullText.includes("clear")) action = "clear";
    if (fullText.includes("read")) action = "read";

    const session = sessions.get(senderID);

    // --- 1. READ MESSAGE ---
    if (action === "read") {
        const index = parseInt(args[1] || fullText.split("read")[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Can't find that message. Check inbox first.");

        const mail = session.lastMessages[index];
        const body = mail.body_text || mail.body_html?.replace(/<[^>]*>?/gm, '') || "No text content.";
        const readMsg = `📖 **MESSAGE**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from_name || "Unknown"} (${mail.from_email})\n📝 **Sub:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // --- 2. CHECK INBOX ---
    if (action === "inbox") {
        if (!session) return reply("⚠️ You don't have an email yet. Type 'generate'.");

        try {
            const res = await http.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, {
                headers: { 'apy-token': token }
            });

            const messages = res.data.messages || [];
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 **Inbox is Empty**\nAddress: ${session.email}`, ["Check Inbox", "Clear Session"], senderID);
            }

            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **INBOX (${messages.length})**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from_name || "Unknown"}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 Type: 'read 1' to view.`;
            
            return api.sendQuickReply(list, ["Check Inbox", "Clear Session"], senderID);
        } catch (e) { return reply("❌ Inbox check failed. Email might be expired."); }
    }

    // --- 3. GENERATE NEW EMAIL ---
    if (action === "gen") {
        try {
            const res = await http.post('https://api.apyhub.com/boomlify/emails/create', {}, {
                headers: { 'apy-token': token },
                params: { time: "1hour" } 
            });

            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { 
                    email: data.address, 
                    id: data.id, 
                    lastMessages: [] 
                });

                const mainMsg = `📧 **NEW EMAIL**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nStatus: Active (1 Hour)\n━━━━━━━━━━━━━━━━`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);
                setTimeout(() => { reply(data.address); }, 1000);
                return;
            }
        } catch (e) { return reply("❌ Limit reached. Try again later."); }
    }

    // --- 4. CLEAR ---
    if (action === "clear") {
        if (!session) return reply("🧹 Nothing to clear.");
        try {
            http.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, {
                headers: { 'apy-token': token }
            }).catch(()=>{}); 
            sessions.delete(senderID);
            return reply("🧹 Session wiped.");
        } catch (e) {
            sessions.delete(senderID);
            return reply("🧹 Session cleared locally.");
        }
    }

    // --- DEFAULT HELP ---
    const helpHeader = `📧 **TEMP MAIL**\n━━━━━━━━━━━━━━━━\nProtect your privacy with a disposable email.\n\nType 'generate' or click below:`;

    if (session) {
        return api.sendQuickReply(`${helpHeader}\n\n✅ **Active:** ${session.email}`, ["Check Inbox", "Clear Session"], senderID);
    }

    return api.sendQuickReply(helpHeader, ["Generate Email"], senderID);
};
