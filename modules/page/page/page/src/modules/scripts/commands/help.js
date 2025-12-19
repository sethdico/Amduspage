const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Yan Maglinte",
  version: "1.0",
  category: "Utility",
  description: "Sends a back greeting message and lists all commands and events.",
  adminOnly: false,
  usePrefix: true,
  cooldown: 5, // Cooldown time in seconds
};

module.exports.run = function ({ event, args }) {
  if (event.type === "message" || event.postback.payload === "HELP_PAYLOAD") {
    const commandsPath = path.join(__dirname, "../commands");
    const eventsPath = path.join(__dirname, "../events");

    let message = "Here are the available commands and events:\n\n";

    // Load and log command details
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    message += "Commands:\n";
    commandFiles.forEach((file) => {
      const command = require(path.join(commandsPath, file));
      if (command.config) {
        message += `${command.config.usePrefix ? PREFIX : ""}${command.config.name}\n`;
        message += `Author: ${command.config.author}\n`;
        message += `Description: ${command.config.description}\n\n`;
        // message += `Admin Only: ${command.config.adminOnly ? "Yes" : "No"}\n`;
        // message += `Prefix Required: ${command.config.usePrefix ? "Yes" : "No"}\n\n`;
      }
    });

    // Load and log event details
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));
    message += "Events:\n";
    eventFiles.forEach((file) => {
      const event = require(path.join(eventsPath, file));
      if (event.config) {
        message += `- ${event.config.name}\n`;
        message += `Author: ${event.config.author}\n`;
        message += `Description: ${event.config.description}\n\n`;
        // message += `Admin Only: ${event.config.adminOnly ? "Yes" : "No"}\n\n`;
      }
    });

    message += "Feel free to use these commands and events as you wish.";
    // Send the message to the user
    api.sendMessage(message, event.sender.id);
  }
};