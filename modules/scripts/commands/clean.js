const fs = require('fs').promises;
const path = require('path');

module.exports.config = {
    name: "clean", author: "Sethdico", category: "Admin", adminOnly: true, usePrefix: false
};

module.exports.run = async function ({ reply }) {
    try {
        const files = await fs.readdir(global.CACHE_PATH);
        for (const file of files) if (file !== ".gitkeep") await fs.unlink(path.join(global.CACHE_PATH, file));
        reply("🧹 Root cache purged.");
    } catch (e) { reply("❌ Cleanup failed."); }
};
