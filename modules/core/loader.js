const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function autoInstall(moduleName) {
    try {
        console.log("installing package: " + moduleName);
        execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
        return true;
    } catch (e) {
        console.error("install failed: " + moduleName);
        return false;
    }
}

function safeRequire(filePath) {
    try {
        return require(filePath);
    } catch (err) {
        const match = err.message.match(/Cannot find module '(.+?)'/);
        if (match) {
            const pkg = match[1];
            if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
                if (autoInstall(pkg)) {
                    return require(filePath);
                }
            }
        }
        throw err;
    }
}

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith('.js')) continue;

        try {
            const cmd = safeRequire(filePath);
            if (cmd.config && cmd.config.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                if (cmd.config.aliases) {
                    cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
                console.log("loaded: " + name);
            }
        } catch (e) {
            console.error("failed to load: " + file);
        }
    }
}

module.exports = { loadCommands };
