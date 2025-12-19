const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const { getTheme } = require("../website/web.js");
const cooldowns = {}; // Track cooldowns for each user and command

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const eventsPath = path.join(__dirname, "../modules/scripts/events");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));

  // Check if the sender is an admin
  const isAdmin = config.ADMINS.includes(event.sender.id);

  if (event?.message?.is_echo) {
    event.sender.id = event.recipient.id;
  };

  // Mark messages as seen if turned on
  if (config.markAsSeen) {
    api.markAsSeen(true, event.threadID).then().catch(err => console.error(err));
  };

  // Extract command text and arguments from the event
  const messageText = event.message?.text || event.postback?.title || "";
  const [rawCommandName, ...args] = messageText.split(" ");

  for (const file of commandFiles) {
    const commandPath = path.join(modulesPath, file);
    const command = require(commandPath);

    if (command && command.config && typeof command.config.name === "string") {
      let commandName;

      // Check if the command requires a prefix
      if (command.config.usePrefix) {
        if (rawCommandName.startsWith(config.PREFIX)) {
          commandName = rawCommandName.slice(config.PREFIX.length).toLowerCase();
        } else {
          continue; // Skip if the command requires prefix but it's not used
        }
      } else {
        commandName = rawCommandName.toLowerCase();

        // Notify the user that the command doesn't need a prefix if they used one
        if (rawCommandName.startsWith(config.PREFIX + command.config.name) && !command.config.usePrefix) {
          api.sendMessage(`The "${command.config.name}" command does not require a prefix. Please try again without it.`, event.sender.id);
          continue;  // Skip execution of this command if prefix is used unnecessarily
        }
      }

      // Check if the command is admin-only and if the sender is an admin
      if (commandName === command.config.name.toLowerCase() && command.config.adminOnly && !isAdmin) {
        api.sendMessage("You do not have permission to use this command.", event.sender.id);
        continue;
      }

      if (command.config.name.toLowerCase() === commandName) {
        const cooldownTime = command.config.cooldown || 0; // Default to 0 seconds if cooldown is not set
        const userCooldown = cooldowns[event.sender.id] || {};
        const lastUsed = userCooldown[command.config.name] || 0;
        const now = Date.now();

        // Check cooldown only if it's greater than 0
        if (cooldownTime > 0 && now - lastUsed < cooldownTime * 1000) {
          const remainingTime = Math.ceil((cooldownTime * 1000 - (now - lastUsed)) / 1000);
          api.sendMessage(`Please wait ${remainingTime} second(s) before using this command again.`, event.sender.id);
          return;
        }

        // Update cooldown
        cooldowns[event.sender.id] = {
          ...userCooldown,
          [command.config.name]: now
        };

        console.log(getTheme().gradient(`SYSTEM:`), `${command.config.name} command was executed!`);
        try {
          await command.run({ event, args });
        } catch (error) {
          console.error(`Error executing ${command.config.name}:`, error);
        }
      }
    } else {
      console.log(`Skipped command: ${file} - missing or invalid config.`);
    }
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
  for (const file of eventFiles) {
    const eventModulePath = path.join(eventsPath, file);
    const ev = require(eventModulePath);

    if (!ev.config?.selfListen && event.message?.is_echo) return;

    try {
      await ev.run({ event, args });
    } catch (error) {
      console.error(`Error executing event handler ${file}:`, error);
    }
  }
};