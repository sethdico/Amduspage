const config = require("../../../config.json");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "9.0-Final",
  category: "Utility",
  description: "View command list or folder details.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const prefix = config.PREFIX || "/";
  const commands = global.client.commands;
  const input = args[0]?.toLowerCase();

  // Custom descriptions and usage hints
  const commandDetails = {
    "ai": { 
      hint: "[question]", 
      note: "No need to use this command since it automatically answers your questions without a command name." 
    },
    "translate": { hint: "[lang] [text]" },
    "pokemon": { hint: "[name]" },
    "nasa": { hint: "random" },
    "remind": { hint: "[time] [message]" },
    "wiki": { hint: "[query]" },
    "ban": { hint: "[ID]" },
    "unban": { hint: "[ID]" },
    "deepimg": { hint: "[prompt]" },
    "aria": { hint: "[question]" },
    "copilot": { hint: "[message]" },
    "quillbot": { hint: "[text]" },
    "venice": { hint: "[question]" },
    "webpilot": { hint: "[query]" },
    "youai": { hint: "[question]" },
    "dict": { hint: "[word]" }
  };

  // Organize commands into categories (Exclude Admin)
  const categories = {};
  commands.forEach((cmd) => {
    const cat = cmd.config.category || "General";
    if (cat.toLowerCase() === "admin") return;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(cmd.config);
  });

  const categoryNames = Object.keys(categories);

  // 1. IF USER CLICKS A FOLDER OR TYPES A CATEGORY NAME
  const matchedCat = categoryNames.find(c => c.toLowerCase() === input);
  if (matchedCat) {
    let catMsg = `📂 **FOLDER: ${matchedCat.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n`;
    
    categories[matchedCat].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
      const details = commandDetails[cmd.name] || {};
      const usage = `${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}`;
      const desc = details.note || cmd.description || "No description.";

      catMsg += `🔹 **${cmd.name.toUpperCase()}**\n`;
      catMsg += `📝 ${desc}\n`;
      catMsg += `💡 Usage: \`${usage}\`\n\n`;
    });

    catMsg += `━━━━━━━━━━━━━━━━`;
    return api.sendButton(catMsg, [{ type: "postback", title: "⬅️ Main Menu", payload: "help" }], senderID);
  }

  // 2. IF USER TYPES A SPECIFIC COMMAND NAME
  if (input && (commands.has(input) || global.client.aliases.has(input))) {
    const cmdName = commands.has(input) ? input : global.client.aliases.get(input);
    const cmd = commands.get(cmdName).config;
    const details = commandDetails[cmd.name] || {};

    const msg = `🤖 **COMMAND: ${cmd.name.toUpperCase()}**\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📝 **Info:** ${details.note || cmd.description || "No description."}\n` +
      `🔧 **Usage:** ${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}\n` +
      `${cmd.aliases && cmd.aliases.length > 0 ? `🔗 **Aliases:** ${cmd.aliases.join(", ")}` : ""}\n` +
      `━━━━━━━━━━━━━━━━`;

    return api.sendButton(msg, [{ type: "postback", title: "⬅️ Back", payload: "help" }], senderID);
  }

  // 3. MAIN MENU (List of Categories)
  let menuMsg = `🤖 **AMDUSBOT MENU**\n━━━━━━━━━━━━━━━━\n`;
  const buttons = [];
  const sortedCats = categoryNames.sort();

  sortedCats.forEach(cat => {
    const names = categories[cat].map(c => c.name).sort().join(", ");
    menuMsg += `📁 **${cat.toUpperCase()}**\n[ ${names} ]\n\n`;
    
    // Create buttons for folders (Limit 3 for Messenger compatibility)
    if (buttons.length < 3) {
      buttons.push({ type: "postback", title: `Open ${cat}`, payload: `help ${cat.toLowerCase()}` });
    }
  });

  menuMsg += `━━━━━━━━━━━━━━━━\n💡 Click a button to see descriptions and usage.`;
  await api.sendButton(menuMsg, buttons, senderID);
};
