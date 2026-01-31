const path = require('path');
const fs = require('fs');
module.exports.config = { name: "refresh", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, reply }) {
    const dir = path.join(__dirname, "../../modules/commands");
    function reload(d) {
        fs.readdirSync(d).forEach(f => {
            const p = path.join(d, f);
            if (fs.statSync(p).isDirectory()) reload(p);
            else if (f.endsWith(".js")) {
                delete require.cache[require.resolve(p)];
                const c = require(p);
                if (c.config?.name) global.client.commands.set(c.config.name.toLowerCase(), c);
            }
        });
    }
    reload(dir);
    reply("Commands reloaded.");
};
