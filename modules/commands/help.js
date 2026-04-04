module.exports.config = {
    name: "help",
    author: "sethdico",
    version: "22.1",
    category: "Utility",
    description: "shows all available commands",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, reply }) {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.adminOnly && !isAdmin) return; 
        
        const cooldown = cmd.config.cooldown ? `cooldown: ${cmd.config.cooldown}s` : '';
        const author = cmd.config.author ? `author: ${cmd.config.author}` : '';
        const version = cmd.config.version ? `version: ${cmd.config.version}` : '';
        const aliases = cmd.config.aliases?.length ? `aliases: ${cmd.config.aliases.join(', ')}` : '';
        
        let info = `𝗛𝗘𝗟𝗣\n\n`;
        info += `${cmd.config.name.toLowerCase()} - ${cmd.config.description || 'no description provided'}\n\n`;
        info += `usage:\n${cmd.config.name.toLowerCase()} <query>\n`;
        if (aliases) info += `${cmd.config.name.toLowerCase()} <${cmd.config.aliases[0]}>\n`;
        info += `\nexample:\n${cmd.config.name.toLowerCase()} tell me a story`;
        if (author) info += `\n\n${cmd.config.author}`;
        if (version) info += `\n${cmd.config.version}`;
        if (cooldown) info += `\n${cmd.config.cooldown}s`;
        
        return reply(info.toLowerCase());
    }
    return reply(`command "${input}" not found`);
  }

  const commands = Array.from(global.client.commands.values());
  const categories = [...new Set(commands.map(c => c.config.category || "Uncategorized"))];

  let msg = `𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗟𝗜𝗦𝗧\n\n`;
  msg += `total: ${commands.length} commands | access: ${isAdmin ? 'admin' : 'user'}\n\n`;
  
  categories.forEach(cat => {
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      const names = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => !global.disabledCommands?.has(c.config.name))
          .map(c => `${c.config.name}`)
          .sort()
          .join(', ');

      if (names) {
          const count = cmds.filter(c => !c.config.adminOnly || isAdmin).length;
          msg += `${cat.toLowerCase()} [${count}]: ${names}\n\n`;
      }
  });
  
  msg += `tips:\ntype any command for usage guide\nhelp <command> for details\n\nexample:\ngemini or help gemini`;
  
  return reply(msg.toLowerCase());
};
