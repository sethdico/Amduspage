const axios = require("axios");

// ram storage for sessions
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    author: "Sethdico",
    version: "1.2",
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

    if (!token || token === "SECURED_ON_RENDER") {
        return reply("❌ apy_token missing on render environment.");
    }

    // 1. generate mail
    if (action === "gen" || !action) {
        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            // using the exact boomlify create endpoint from your docs
            const res = await axios.post('https://api.apyhub.com/boomlify/emails/create', {}, {
                headers: { 'apy-token': token },
                params: { time: "1hour" } // set to 1 hour so it doesn't expire too fast
            });

            if (res.data.success) {
                const email = res.data.email.address;
                sessions.set(senderID, email);
                return reply(`📧 **temp mail**\n━━━━━━━━━━━━━━━━\naddress: ${email}\nexpires: in 1 hour\n\n💡 type "tempmail inbox" to check.`);
            } else {
                throw new Error("API failed");
            }
        } catch (e) {
            console.error(e.response?.data || e.message);
            return reply("❌ failed to gen mail. check token.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // 2. check inbox
    if (action === "inbox" || action === "check") {
        const email = sessions.get(senderID);
        if (!email) return reply("⚠️ gen a mail first. type 'tempmail gen'.");

        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            // boomlify inbox endpoint
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/inbox`, {
                headers: { 'apy-token': token },
                params: { address: email }
            });

            // adjusted based on standard boomlify response keys
            const messages = res.data.items || res.data.data || [];
            
            if (messages.length === 0) return reply("📭 inbox is empty.");

            let msg = `📬 **inbox: ${email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                msg += `${i + 1}. from: ${m.from?.address || m.from}\nsub: ${m.subject}\n\n`;
            });
            
            return reply(msg);
        } catch (e) {
            return reply("❌ failed to fetch inbox.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // 3. clear
    if (action === "clear") {
        sessions.delete(senderID);
        return reply("🧹 session cleared.");
    }

    reply("❓ usage: tempmail <gen|inbox|clear>");
};
