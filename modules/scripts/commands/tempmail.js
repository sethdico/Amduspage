const axios = require("axios");

// RAM storage for sessions: { email, id, createdAt, lastMessages }
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    // These ALIASES are required so clicking buttons doesn't trigger the AI
    aliases: ["generate", "inbox", "check", "clear"], 
    author: "Sethdico",
    version: "4.0",
    category: "Utility",
    description: "temp mail via boomlify api.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN is missing in Render environment variables.");

    // --- SMART ROUTING ---
    // This catches both ".tempmail gen" and clicking a button like "Generate Email"
    const fullText = (event.message?.text || event.postback?.payload || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    if (fullText.includes("generate")) action = "gen";
    if (fullText.includes("inbox") || fullText.includes("check")) action = "inbox";
    if (fullText.includes("clear")) action = "clear";
    if (fullText.includes("read")) action = "read";

    const session = sessions.get(senderID);

    // --- ACTION: READ ---
    if (action === "read") {
        const index = parseInt(args[1] || fullText.split("read")[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Message not found. Please refresh your inbox.");

        const mail = session.lastMessages[index];
        const body = mail.text || mail.html?.replace(/<[^>]*>?/gm, '') || "No content.";
        
        const readMsg = `📖 **MESSAGE CONTENT**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from?.address || mail.from}\n📝 **Subject:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // --- ACTION: INBOX ---
    if (action === "inbox") {
        if (!session) return reply("⚠️ No active session. Tap 'Generate Email' below.");

        try {
            // ApyHub standard: GET /boomlify/emails/inbox?address=...
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/inbox`, {
                headers: { 'apy-token': token },
                params: { address: session.email },
                timeout: 15000
            });

            // The API returns an array or an object with 'items'
            const messages = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 **Inbox is Empty**\nAddress: ${session.email}\n\nNo messages have arrived yet. Try refreshing in a few seconds.`, ["Check Inbox", "Clear Session"], senderID);
            }

            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **INBOX: ${session.email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from?.address || m.from}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 To read a message, type: tempmail read [number]`;
            
            return api.sendQuickReply(list, ["Check Inbox", "Clear Session"], senderID);
        } catch (e) { 
            console.error("Inbox Error:", e.response?.data || e.message);
            return reply("❌ Failed to fetch inbox. The service might be busy."); 
        }
    }

    // --- ACTION: GENERATE ---
    if (action === "gen") {
        try {
            const res = await axios.post('https://api.apyhub.com/boomlify/emails/create', {}, {
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

                const mainMsg = `📧 **DISPOSABLE EMAIL CREATED**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nStatus: Active (1 Hour)\n━━━━━━━━━━━━━━━━\nUse the address below to receive mail:`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);
                
                // Delay raw address for easy copy-pasting to avoid anti-spam
                setTimeout(() => { reply(data.address); }, 1500);
                return;
            }
        } catch (e) { 
            console.error("Gen Error:", e.response?.data || e.message);
            return reply("❌ Failed to generate email. Check your API quota."); 
        }
    }

    // --- ACTION: CLEAR ---
    if (action === "clear") {
        sessions.delete(senderID);
        return reply("🧹 Your temp-mail session has been wiped.");
    }

    // --- ACTION: HELP / STATUS ---
    const helpHeader = 
        `📧 **TEMP-MAIL UTILITY**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `Generate temporary email addresses to protect your privacy and stay safe from spam.\n\n` +
        `🔹 **Commands:**\n` +
        `• tempmail gen - Create new mail\n` +
        `• tempmail inbox - Check messages\n` +
        `• tempmail read [n] - Read a specific mail\n` +
        `• tempmail clear - Wipe session\n` +
        `━━━━━━━━━━━━━━━━`;

    if (session) {
        return api.sendQuickReply(`${helpHeader}\n\n✅ **Current Active Mail:**\n${session.email}`, ["Check Inbox", "Clear Session"], senderID);
    }

    return api.sendQuickReply(helpHeader, ["Generate Email"], senderID);
};
