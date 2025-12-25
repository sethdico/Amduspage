const axios = require("axios");

// RAM storage for sessions: { email, id, createdAt, lastMessages }
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    author: "Sethdico",
    version: "3.0",
    category: "Utility",
    description: "temp mail via boomlify api.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const action = args[0]?.toLowerCase();
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN missing.");

    const session = sessions.get(senderID);

    // --- 1. SMART CONTENT READER ---
    if (action === "read") {
        const index = parseInt(args[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Message not found. Check inbox first.");

        const mail = session.lastMessages[index];
        const body = mail.text || mail.html?.replace(/<[^>]*>?/gm, '') || "No content.";
        
        const readMsg = `📖 **MESSAGE**\n━━━━━━━━━━━━━━━━\n👤 From: ${mail.from?.address || mail.from}\n📝 Sub: ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Back to Inbox", "Clear Session"], senderID);
    }

    // --- 2. SMART INBOX FETCH ---
    if (action === "inbox" || action === "check" || action === "back") {
        if (!session) return reply("⚠️ You don't have an active email. Tap 'Generate' below.");

        try {
            // Using address-based lookup (Standard ApyHub/Boomlify)
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/inbox`, {
                headers: { 'apy-token': token },
                params: { address: session.email }
            });

            const messages = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 Inbox is empty for:\n${session.email}\n\nNo messages received yet.`, ["Refresh Inbox", "Clear Session"], senderID);
            }

            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **Inbox for: ${session.email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => list += `[${i + 1}] From: ${m.from?.address || m.from}\nSub: ${m.subject}\n\n`);
            list += `━━━━━━━━━━━━━━━━\n💡 Reply "tempmail read 1" to open.`;
            
            return api.sendQuickReply(list, ["Refresh Inbox", "Clear Session"], senderID);
        } catch (e) { 
            return reply("❌ Inbox currently unavailable."); 
        }
    }

    // --- 3. OPTIMIZED GENERATOR ---
    if (action === "gen" || action === "generate") {
        if (session) return api.sendQuickReply(`⚠️ You already have an active mail:\n${session.email}\n\nClear it first to make a new one.`, ["Check Inbox", "Clear Session"], senderID);

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
                    createdAt: Date.now(),
                    lastMessages: [] 
                });

                const mainMsg = `📧 **Temp Mail Ready**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nExpires: In 1 hour\n━━━━━━━━━━━━━━━━`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);

                // Anti-spam delay for the copy-paste address
                setTimeout(() => { reply(data.address); }, 1500);
                return;
            }
        } catch (e) { return reply("❌ Failed to generate email."); }
    }

    // --- 4. CLEAR SESSION ---
    if (action === "clear" || action === "delete") {
        sessions.delete(senderID);
        return reply("🧹 Your session has been wiped. Your data is gone.");
    }

    // --- 5. THE "WISE" SMART MENU ---
    // This triggers if the user just types "tempmail"
    if (session) {
        const minutesLeft = Math.max(0, 60 - Math.floor((Date.now() - session.createdAt) / 60000));
        const statusMsg = `📧 **Active Session**\n━━━━━━━━━━━━━━━━\nEmail: ${session.email}\nStatus: Active\nRemaining: ~${minutesLeft} mins\n━━━━━━━━━━━━━━━━\nWhat would you like to do?`;
        
        return api.sendQuickReply(statusMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // If no session and no action, show standard welcome
    const helpText = `📧 **TempMail Manager**\n\njust added tempmail command. works by tempmail gen|inbox|clear. skip the spam signups. 📧✨`;
    return api.sendQuickReply(helpText, ["Generate Email"], senderID);
};
