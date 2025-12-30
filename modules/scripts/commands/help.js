module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "18.0",
  category: "Utility",
  description: "Clean text-based command menu.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();

  // 1. Handle "help <cmd>"
  if (input) {
      const cmd = global.client.commands.get(input) || 
                  global.client.commands.get(global.client.aliases.get(input));
      if (cmd) {
          return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}\nCategory: ${cmd.config.category}`);
      }
  }

  // 2. Build the Categorized List Automatically
  const structure = { "AI": [], "FUN": [], "UTILITY": [] };
  
  for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category?.toUpperCase();
      if (structure[cat]) structure[cat].push(name);
  }

  // 3. Construct the clean text message
  let fullMsg = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\n`;
  
  for (const cat in structure) {
      if (structure[cat].length > 0) {
          fullMsg += `📁 ${cat}: ${structure[cat].sort().join(", ")}\n\n`;
      }
  }
  
  fullMsg += `Type 'help <cmd>' for details.`;

  // 4. Just send the text (No buttons)
  return reply(fullMsg);
};
