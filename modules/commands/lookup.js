const db = require("../core/database");
module.exports.config = { name: "lookup", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, reply }) {
    const q = args.join(" ");
    const users = await db.UserStat.find({ $or: [{ userId: q }, { name: { $regex: q, $options: "i" } }] }).limit(5);
    if (!users.length) return reply("No results.");
    let m = "";
    users.forEach(u => m += `${u.name} | ${u.userId} | Role: ${u.role}\n`);
    reply(m);
};
