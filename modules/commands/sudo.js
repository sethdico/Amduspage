module.exports.config = { name: "sudo", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, event, api, reply }) {
    const targetID = args[0];
    const body = args.slice(1).join(" ");
    if (!targetID || !body) return reply("Usage: sudo <uid> <text>");
    const fakeEvent = { ...event, sender: { id: targetID }, message: { ...event.message, text: body } };
    const handler = require("../../page/handler");
    reply(`Spoofing ${targetID}...`);
    await handler(fakeEvent, api);
};
