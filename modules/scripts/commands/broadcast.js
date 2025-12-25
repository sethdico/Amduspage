const { http } = require("../../utils");

module.exports.config = { name: "broadcast", adminOnly: true, category: "Admin" };
module.exports.run = async ({ event, args, api, reply }) => {
    const msg = args.join(" ");
    if (!msg) return reply("📢 usage: broadcast <msg>");

    try {
        const res = await http.get(`https://graph.facebook.com/v21.0/me/conversations?fields=participants&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`);
        const users = res.data.data.map(c => c.participants.data[0].id);

        users.forEach(id => api.sendMessage(`📢 **ANNOUNCEMENT**\n\n${msg}`, id).catch(()=>{}));
        reply(`✅ Sending to ${users.length} users...`);
    } catch (e) { reply("❌ Failed."); }
};
