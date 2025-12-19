module.exports.config = {
    name: "remind",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Utility",
    description: "Set a reminder (s/m/h)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const input = args.join(" ");
    // Regex matches "10m check rice"
    const match = input.match(/^(\d+)([smh])\s+(.+)$/);

    if (!match) {
        return api.sendMessage("⚠️ Usage: remind 10m Check Rice\n(s=sec, m=min, h=hour)", event.sender.id);
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    const msg = match[3];

    let delay = 0;
    if (unit === 's') delay = value * 1000;
    if (unit === 'm') delay = value * 60 * 1000;
    if (unit === 'h') delay = value * 60 * 60 * 1000;

    if (delay > 86400000) return api.sendMessage("⚠️ Max 24 hours.", event.sender.id);

    api.sendMessage(`⏰ I will remind you in ${value}${unit}: "${msg}"`, event.sender.id);

    setTimeout(() => {
        api.sendMessage(`⏰ **REMINDER**\n━━━━━━━━━━━━\nHello! You asked me to remind you:\n\n"${msg}"`, event.sender.id);
    }, delay);
};
