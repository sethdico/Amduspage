const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "2.5",
  category: "Utility",
  description: "Interactive command dashboard.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const commandsPath = __dirname;
  
  // Handle "help ai" details
  if (args[0]?.toLowerCase() === "ai") {
    const aiHelp = `🤖 **Amdusbot AI Tips**\n━━━━━━━━━━━━━━━━\n` +
      `• Just talk! No need for ! or /\n` +
      `• Send images to analyze them\n` +
      `• Ask: "Make a PDF about taxes"\n` +
      `• Ask: "Draw a futuristic city"\n` +
      `• Send a YouTube link to summarize`;
    return api.sendMessage(aiHelp, senderID);
  }

  try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    const categories = {};

    commandFiles.forEach(file => {
      const cmd = require(path.join(commandsPath, file));
      if (cmd.config && cmd.config.name) {
        const cat = cmd.config.category || "General";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.config.name);
      }
    });

    let helpMsg = `🤖 **Amdusbot Dashboard**\n━━━━━━━━━━━━━━━━\n`;
    for (const [category, cmds] of Object.entries(categories)) {
      helpMsg += `📂 **${category}**\n   ${cmds.join(", ")}\n\n`;
    }

    const buttons = [
      {
        type: "web_url",
        url: "https://www.facebook.com/seth09asher",
        title: "Contact Owner"
      },
      {
        type: "web_url",
        url: "https://github.com/sethdico",
        title: "Bot GitHub"
      }
    ];

    await api.sendButton(helpMsg + "━━━━━━━━━━━━━━━━", buttons, senderID);
    
  } catch (err) {
    api.sendMessage("❌ Error loading command list.", senderID);
  }
};
