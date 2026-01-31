const { exec } = require("child_process");
module.exports.config = { name: "shell", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, reply }) {
    exec(args.join(" "), (e, so, se) => reply(so || se || e.message));
};
