const config = require("../../../config.json");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "6.5-Detailed",
  category: "Utility",
  description: "View command list or details of a specific command.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { senderID } = event;
  const prefix = config.PREFIX || "/";
  const isAdmin = config.ADMINS.includes(senderID);
  const commands = global.client.commands;
  const input = args[0]?.toLowerCase();

  const commandDetails = {
    "ai": {
      hint: "[question]",
      note: "No need to use this command since it is automatically answer ut question without command"
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

  try {
    // 1. INDIVIDUAL COMMAND INFO
    if (input && (commands.has(input) || global.client.aliases.get(input))) {
      const cmdName = commands.has(input) ? input : global.client.aliases.get(input);
      const cmd = commands.get(cmdName).config;
      const details = commandDetails[cmd.name] || {};

      const msg = `🤖 **COMMAND: ${cmd.name.toUpperCase()}**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📝 **Description:** ${details.note || cmd.description || "No description."}\n` +
        `📁 **Category:** ${cmd.category}\n` +
        `🔧 **Usage:** ${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}\n` +
        `${cmd.aliases ? `🔗 **Aliases:** ${cmd.aliases.join(", ")}` : ""}\n` +
        `━━━━━━━━━━━━━━━━`;

      return api.sendButton(msg, [{ type: "postback", title: "⬅️ Back", payload: "help" }], senderID);
    }

    // Organize commands into categories
    const categories = {};
    commands.forEach((cmd) => {
      const cat = cmd.config.category || "General";
      if (cat.toLowerCase() === "admin" && !isAdmin) return;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config);
    });

    // 2. FOLDER DETAIL VIEW
    const matchedCat = Object.keys(categories).find(c => c.toLowerCase() === input);
    if (matchedCat) {
      let catMsg = `📂 **FOLDER: ${matchedCat.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n`;
      
      categories[matchedCat].forEach(cmd => {
        const details = commandDetails[cmd.name] || {};
        const usage = `${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}`;
        const desc = details.note || cmd.description || "No description.";

        catMsg += `🔹 **${cmd.name.toUpperCase()}**\n`;
        catMsg += `📝 ${desc}\n`;
        catMsg += `💡 Usage: \`${usage}\`\n\n`;
      });

      catMsg += `━━━━━━━━━━━━━━━━\n💡 *Type "help [command]" for more info.*`;
      return api.sendButton(catMsg, [{ type: "postback", title: "⬅️ Menu", payload: "help" }], senderID);
    }

    // 3. MAIN MENU
    let menuMsg = `🤖 **AMDUSBOT MENU**\n━━━━━━━━━━━━━━━━\n`;
    const buttons = [];
    const sortedCats = Object.keys(categories).sort();

    sortedCats.forEach(cat => {
      menuMsg += `📁 **${cat}**: ${categories[cat].length} commands\n`;
      if (buttons.length < 3) {
        buttons.push({ type: "postback", title: `Open ${cat}`, payload: `help ${cat}` });
      }
    });

    menuMsg += `\n━━━━━━━━━━━━━━━━\n💡 *Click a folder to see commands, descriptions, and usage.*`;
    await api.sendButton(menuMsg, buttons, senderID);

  } catch (err) {
    console.log(err);
    api.sendMessage("An error occurred while running the help command.", senderID);
  }
};
