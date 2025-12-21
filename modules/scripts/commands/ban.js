const fs = require("fs");
const path = require("path");
const config = require("../../../../config.json"); // Adjust path if needed

const bannedPath = path.join(__dirname, "banned.json");

// Load Banned List
let bannedUsers = [];
if (fs.existsSync(bannedPath)) {
    try { bannedUsers = JSON.parse(fs.readFileSync(bannedPath)); } catch(e) {}
} else {
    fs.writeFileSync(bannedPath, "[]");
}

module.exports.config = {
    name: "admin",
    aliases: ["ban", "unban"], // These trigger the command too
    author: "Sethdico",
    version: "1.0",
    category: "Admin",
    description: "Manage users (ban/unban)",
    adminOnly: true, // Only admins in config.json can use
    usePrefix: false, // Allows "ban 12345" without !
    cooldown: 0,
};

module.exports.run = async function ({ event, args }) {
    const action = args[0]?.toLowerCase(); // ban, unban, list
    const targetID = args[1]; // The UID

    // Security Check
    if (!config.ADMINS.includes(event.sender.id)) {
        return api.sendMessage("❌ You are not an admin.", event.sender.id);
    }

    if (!action) {
        return api.sendMessage("👮‍♂️ **Admin Panel**\nUsage:\n• ban <uid>\n• unban <uid>\n• admin list", event.sender.id);
    }

    // --- BAN ---
    if (action === "ban" || event.message.text.toLowerCase().startsWith("ban")) {
        if (!targetID) return api.sendMessage("⚠️ usage: ban <uid>", event.sender.id);
        if (config.ADMINS.includes(targetID)) return api.sendMessage("❌ You cannot ban an admin.", event.sender.id);
        
        if (!bannedUsers.includes(targetID)) {
            bannedUsers.push(targetID);
            fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));
            return api.sendMessage(`🚫 **User Banned**\nUID: ${targetID}\nThey can no longer use the bot.`, event.sender.id);
        } else {
            return api.sendMessage("⚠️ User is already banned.", event.sender.id);
        }
    }

    // --- UNBAN ---
    if (action === "unban" || event.message.text.toLowerCase().startsWith("unban")) {
        if (!targetID) return api.sendMessage("⚠️ usage: unban <uid>", event.sender.id);
        
        const index = bannedUsers.indexOf(targetID);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));
            return api.sendMessage(`✅ **User Unbanned**\nUID: ${targetID}`, event.sender.id);
        } else {
            return api.sendMessage("⚠️ User was not banned.", event.sender.id);
        }
    }

    // --- LIST ---
    if (action === "list") {
        return api.sendMessage(`🚫 **Banned Users:**\n${bannedUsers.join("\n") || "None"}`, event.sender.id);
    }
};
