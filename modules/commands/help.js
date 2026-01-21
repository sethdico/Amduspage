module.exports.config = {
  name: "help", 
  author: "Sethdico", 
  version: "22.0", 
  category: "Utility", 
  description: "command list", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  // specific command info
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.adminOnly && !isAdmin) return; 
        return reply(`${cmd.config.name}\n${cmd.config.description || 'no description'}`);
    }
    return reply(`command "${input}" not found`);
  }

  // get all unique categories dynamically
  const commands = Array.from(global.client.commands.values());
  const categories = [...new Set(commands.map(c => c.config.category || "Uncategorized"))];

  let msg = "commands\n\n";
  
  categories.forEach(cat => {
      // filter commands in this category
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      // hide admin category if user isn't admin
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      // get names
      const names = cmds
          .filter(c => !c.config.adminOnly || isAdmin) // double check visibility
          .map(c => c.config.name)
          .sort()
          .join(", ");

      if (names) {
          msg += `${cat.toLowerCase()}\n${names}\n\n`;
      }
  });
  
  msg += `type: help <command> for info`;
  return reply(msg);
};
