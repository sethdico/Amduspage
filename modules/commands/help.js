module.exports.config = {
    name: "help",
    author: "sethdico",
    category: "Utility",
    description: "shows all available commands",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, reply }) {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  if (input === "search" && args[1]) {
    const keyword = args[1].toLowerCase();
    const commands = Array.from(global.client.commands.values());
    
    const results = commands.filter(cmd => {
        if (cmd.config.adminOnly && !isAdmin) return false;
        if (global.disabledCommands?.has(cmd.config.name)) return false;
        
        return cmd.config.name.toLowerCase().includes(keyword) ||
               (cmd.config.description && cmd.config.description.toLowerCase().includes(keyword)) ||
               (cmd.config.category && cmd.config.category.toLowerCase().includes(keyword));
    });

    if (results.length === 0) {
        return reply(`no commands found for "${keyword}"`);
    }

    let msg = `search results for "${keyword}"\n\n`;
    results.forEach(cmd => {
        msg += `${cmd.config.name}\n`;
        msg += `${cmd.config.description || 'no description'}\n`;
        msg += `${cmd.config.category || 'uncategorized'}\n\n`;
    });
    
    return reply(msg.toLowerCase());
  }

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.adminOnly && !isAdmin) return; 
        
        const cooldown = cmd.config.cooldown ? `cooldown: ${cmd.config.cooldown}s` : '';
        const author = cmd.config.author ? `author: ${cmd.config.author}` : '';
        const aliases = cmd.config.aliases?.length ? `aliases: ${cmd.config.aliases.join(', ')}` : '';
        
        let info = `help\n\n`;
        info += `${cmd.config.name.toLowerCase()} - ${cmd.config.description || 'no description provided'}\n\n`;
        info += `usage:\n${cmd.config.name.toLowerCase()} <query>\n`;
        if (aliases) info += `${cmd.config.name.toLowerCase()} <${cmd.config.aliases[0]}>\n`;
        info += `\nexample:\n${cmd.config.name.toLowerCase()} tell me a story`;
        if (author) info += `\n\n${cmd.config.author}`;
        if (cooldown) info += `\n${cmd.config.cooldown}s`;
        
        return reply(info.toLowerCase());
    }
    return reply(`command "${input}" not found`);
  }

  const commands = Array.from(global.client.commands.values());
  const categories = [...new Set(commands.map(c => c.config.category || "Uncategorized"))];

  let msg = `command list\n\n`;
  msg += `total: ${commands.length} commands | access: ${isAdmin ? 'admin' : 'user'}\n\n`;
  
  categories.forEach(cat => {
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      const availableCmds = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => !global.disabledCommands?.has(c.config.name))
          .map(c => `${c.config.name}`)
          .sort()
          .join(', ');

      if (availableCmds) {
          const count = cmds.filter(c => !c.config.adminOnly || isAdmin).length;
          msg += `${cat.toLowerCase()} [${count}]: ${availableCmds}\n\n`;
      }
  });
  
  msg += `tips:\ntype any command for usage guide\nhelp <command> for details\n\nexample:\ngemini or help gemini`;
  
  return reply(msg.toLowerCase());
};
