const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "4.0-Clean",
  category: "Utility",
  description: "Interactive command menu.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const isAdmin = config.ADMINS.includes(senderID);
  
  const commands = global.client.commands;
  const categories = {};

  // 1. Organize commands into categories
  commands.forEach((cmd) => {
      const cat = cmd.config.category || "General";
      // Skip showing Admin category to non-admins entirely
      if (cat.toLowerCase() === "admin" && !isAdmin) return;
      
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config.name);
  });

  const targetCategory = args[0] ? args[0].toLowerCase() : null;

  // --- SUB-MENU (When user clicks a category or types "help ai") ---
  if (targetCategory) {
      const catName = Object.keys(categories).find(c => c.toLowerCase() === targetCategory);
      
      if (catName) {
          const cmds = categories[catName].map(name => `• ${name}`).join("\n");
          const msg = `📂 **Category: ${catName}**\n━━━━━━━━━━━━━━━━\n${cmds}\n━━━━━━━━━━━━━━━━\n💡 *Tip: Just type the command name to use it!*`;
          
          const buttons = [{ type: "postback", title: "⬅️ Main Menu", payload: "help" }];
          return api.sendButton(msg, buttons, senderID);
      }
  }

  // --- MAIN MENU ---
  let msg = `🤖 **Amdusbot Assistant**\n━━━━━━━━━━━━━━━━\nSelect a command category below to explore my features:\n`;
  
  const buttons = [];
  const sortedCategories = Object.keys(categories).sort();

  sortedCategories.forEach(cat => {
      msg += `\n📁 **${cat}** (${categories[cat].length} commands)`;
      
      // 2. Button Logic: Only show buttons for non-Admin categories
      // And stay within the Facebook 3-button limit
      if (cat.toLowerCase() !== "admin" && buttons.length < 3) {
          buttons.push({
              type: "postback",
              title: `Explore ${cat}`,
              payload: `help ${cat}`
          });
      }
  });

  msg += `\n\n━━━━━━━━━━━━━━━━\n💬 *Or type "help [category]" (e.g., help ai)*`;

  // If user is Admin, remind them of the secret category since there is no button for it
  if (isAdmin && categories["Admin"]) {
      msg += `\n\n🛡️ **Admin Tools:** type "help admin"`;
  }

  await api.sendButton(msg, buttons, senderID);
};
