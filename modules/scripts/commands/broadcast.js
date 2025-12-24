// ================================================
// FILE: modules/scripts/commands/broadcast.js
// ================================================
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

// === CONFIGURATION ===
const QUEUE_FILE = path.join(__dirname, "broadcast_queue.json");
const OPT_OUT_FILE = path.join(__dirname, "broadcast_optouts.json");

// 🟢 SAFE SETTINGS (Anti-Ban)
const BATCH_SIZE = 5;          // Messages per batch
const MIN_INTERVAL = 10;       // Minimum minutes wait
const MAX_INTERVAL = 20;       // Maximum minutes wait

let isBroadcasting = false;

module.exports.config = {
    name: "broadcast",
    aliases: ["announce", "bc"],
    author: "Sethdico",
    version: "3.1-Fixed",
    category: "Admin",
    description: "Send a global announcement to active users.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    const adminList = config.ADMINS || config.ADMIN || [];
    
    // 1. Permission Check
    if (!adminList.includes(senderID)) return; 

    // 2. Argument Parsing (Fixed the cut-off bug)
    const firstWord = args[0]?.toLowerCase();
    let messageRaw = "";

    if (firstWord === "stop") {
        if (fs.existsSync(QUEUE_FILE)) fs.unlinkSync(QUEUE_FILE);
        isBroadcasting = false;
        return api.sendMessage("🛑 Broadcast stopped.", senderID);
    } else if (firstWord === "unsubscribe_action") {
        // Hidden command for button clicks
        handleUnsubscribe(senderID, api);
        return;
    } else {
        // ✅ BUG FIX: Join ALL arguments so "merry" isn't deleted
        messageRaw = args.join(" ");
    }

    if (!messageRaw) return api.sendMessage("📢 Usage: broadcast <your message>", senderID);
    if (isBroadcasting) return api.sendMessage("⚠️ A broadcast is already running.", senderID);

    api.sendMessage("🛡️ Preparing list...", senderID);

    try {
        // 3. Fetch Users
        const allUsers = await fetchAllUsers(api);

        // 4. Filter (23h Rule + Opt-outs)
        const validIDs = filterUsers(allUsers);

        if (validIDs.length === 0) {
            return api.sendMessage("🛡️ No active users found (23h safety rule).", senderID);
        }

        // 5. Save Queue
        const queueData = {
            message: messageRaw,
            ids: validIDs,
            total: validIDs.length,
            sent: 0
        };
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queueData));

        api.sendMessage(
            `✅ **Broadcast Started**\n` +
            `👥 Active Users: ${validIDs.length}\n` +
            `⏱️ Rate: 5 users every ${MIN_INTERVAL}-${MAX_INTERVAL} mins`, 
            senderID
        );

        processSafeQueue(api, senderID);

    } catch (e) {
        api.sendMessage(`❌ Error: ${e.message}`, senderID);
    }
};

// ==========================================
// 🛠️ INTERNAL FUNCTIONS
// ==========================================

function handleUnsubscribe(userID, api) {
    let optOuts = [];
    if (fs.existsSync(OPT_OUT_FILE)) optOuts = JSON.parse(fs.readFileSync(OPT_OUT_FILE));
    if (!optOuts.includes(userID)) {
        optOuts.push(userID);
        fs.writeFileSync(OPT_OUT_FILE, JSON.stringify(optOuts));
    }
    api.sendMessage("🔕 You have been removed from announcements.", userID);
}

async function fetchAllUsers(api) {
    let allUsers = [];
    let url = `https://graph.facebook.com/v21.0/me/conversations?fields=participants,updated_time&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`;
    let pages = 0;
    while (url && pages < 10) { 
        try {
            const res = await axios.get(url);
            res.data.data.forEach(c => {
                if (c.participants?.data[0]) {
                    allUsers.push({ id: c.participants.data[0].id, updated_time: c.updated_time });
                }
            });
            url = res.data.paging?.next;
            pages++;
        } catch (e) { break; }
    }
    return allUsers;
}

function filterUsers(allUsers) {
    let optOuts = [];
    if (fs.existsSync(OPT_OUT_FILE)) optOuts = JSON.parse(fs.readFileSync(OPT_OUT_FILE));
    
    const now = Date.now();
    const safeWindow = 23 * 60 * 60 * 1000; // 23 Hours

    return allUsers
        .filter(u => {
            const lastActive = new Date(u.updated_time).getTime();
            return (now - lastActive) < safeWindow && !optOuts.includes(u.id);
        })
        .map(u => u.id);
}

function processSafeQueue(api, adminID) {
    if (!fs.existsSync(QUEUE_FILE)) return;
    isBroadcasting = true;

    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE));
    const batch = queue.ids.splice(0, BATCH_SIZE);

    batch.forEach(async (id) => {
        try {
            // ✅ NEW CLEAN FORMAT
            const finalMsg = `📢 **Announcement**\n\n${queue.message}`;
            
            const buttons = [{
                type: "postback",
                title: "🔕 Unsubscribe",
                payload: "broadcast unsubscribe_action" 
            }];

            await api.sendButton(finalMsg, buttons, id);
            queue.sent++;
        } catch (e) { /* Ignore */ }
    });

    if (queue.ids.length > 0) {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue));
        
        // Random Wait Time
        const minMs = MIN_INTERVAL * 60 * 1000;
        const maxMs = MAX_INTERVAL * 60 * 1000;
        const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);

        setTimeout(() => processSafeQueue(api, adminID), randomDelay);
    } else {
        fs.unlinkSync(QUEUE_FILE);
        isBroadcasting = false;
        api.sendMessage(`✅ Broadcast Complete. Sent to ${queue.sent} users.`, adminID);
    }
}
