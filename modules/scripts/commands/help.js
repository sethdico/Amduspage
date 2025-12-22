const config = require("../../../config.json");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "5.0-Detailed",
  category: "Utility",
  description: "View command list or details of a specific command.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const prefix = config.PREFIX;
  const isAdmin = config.ADMINS.includes(senderID);
  const commands = global.client.commands;
  const input = args[0]?.toLowerCase();

  const getArgsHint = (name) => {
    const hints = {
      "ai": "[question]",
      "translate": "[lang] [text]",
      "pokemon": "[name]",
      "nasa": "random",
      "remind": "[time] [message]",
      "wiki": "[query]",
      "ban": "[ID]",
      "unban": "[ID]",
      "deepimg": "[prompt]",
      "aria": "[question]",
      "copilot": "[message]",
      "quillbot": "[text]",
      "venice": "[question]",
      "webpilot": "[query]",
      "youai": "[question]",
      "dict": "[word]"
    };
    return hints[name] || "";
  };

  if (input) {
    let command = commands.get(input);
    if (!command) {
      const actualName = global.client.aliases.get(input);
      if (actualName) command = commands.get(actualName);
    }

    if (command) {
      const { name, description, category, cooldown, usePrefix, aliases } = command.config;
      const msg = `🤖 **COMMAND: ${name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📝 **Description:** ${description || "No description."}\n📁 **Category:** ${category}\n⏳ **Cooldown:** ${cooldown || 0}s\n🔧 **Usage:** ${usePrefix ? prefix : ""}${name} ${getArgsHint(name)}\n${aliases && aliases.length > 0 ? `🔗 **Aliases:** ${aliases.join(", ")}` : ""}\n━━━━━━━━━━━━━━━━`;
      
      const buttons = [{ type: "postback", title: "⬅️ Back", payload: "help" }];
      return api.sendButton(msg, buttons, senderID);
    }
  }

  const categories = {};
  commands.forEach((cmd) => {
    const cat = cmd.config.category || "General";
    if (cat.toLowerCase() === "admin" && !isAdmin) return;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(cmd.config.name);
  });

  if (input && Object.keys(categories).some(c => c.toLowerCase() === input)) {
    const catName = Object.keys(categories).find(c => c.toLowerCase() === input);
    const cmds = categories[catName].sort().map(name => `• ${name}`).join("\n");
    const msg = `📂 **CATEGORY: ${catName}**\n━━━━━━━━━━━━━━━━\n${cmds}\n━━━━━━━━━━━━━━━━\n💡 *Type "help <command>" for usage info.*`;
    const buttons = [{ type: "postback", title: "⬅️ Menu", payload: "help" }];
    return api.sendButton(msg, buttons, senderID);
  }

  let msg = `🤖 **AMDUSBOT MENU**\n━━━━━━━━━━━━━━━━\n`;
  const buttons = [];
  const sortedCats = Object.keys(categories).sort();

  sortedCats.forEach(cat => {
    msg += `📁 **${cat}**: ${categories[cat].length} commands\n`;
    if (buttons.length < 3 && cat.toLowerCase() !== "admin") {
      buttons.push({ type: "postback", title: `Explore ${cat}`, payload: `help ${cat}` });
    }
  });

  msg += `\n━━━━━━━━━━━━━━━━\n💡 *Type "help <command>" to see how to use it.*`;
  await api.sendButton(msg, buttons, senderID);
};
