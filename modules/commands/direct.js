module.exports.config = { name: "direct", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, api, reply }) {
    const targetID = args[0];
    const message = args.slice(1).join(" ");
    if (!targetID || !message) return reply("Usage: direct <uid> <message>");
    try {
        await api.sendMessage(`[ADMIN MESSAGE]\n\n${message}`, targetID);
        reply(`Sent to ${targetID}`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
};
