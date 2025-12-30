const db = require("../../database"); 

const loadReminders = () => {
    db.getActiveReminders((list) => {
        list.forEach(r => {
            const delay = new Date(r.fireAt).getTime() - Date.now();
            if (delay > 0 && delay < 2147483647) {
                setTimeout(async () => {
                    // Re-fetch global api just in case
                    if (global.api) {
                        global.api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
                        await db.deleteReminder(r.id); // Manual cleanup for speed
                    }
                }, delay);
            }
        });
    });
};

module.exports.config = { 
    name: "remind", author: "Sethdico", version: "2.6", category: "Utility", description: "Set a reminder.", adminOnly: false, usePrefix: false, cooldown: 3 
};

module.exports.run = async ({ event, args, api, reply }) => {
  const senderID = event.sender.id;
  const input = args.join(" ");

  if (args[0] === "list") {
    const list = await new Promise(resolve => db.getActiveReminders(resolve));
    const userList = list.filter(r => r.userId === senderID);
    return reply(userList.length ? userList.map((r,i)=>`${i+1}. ${r.message}`).join("\n") : "📝 No active reminders.");
  }

  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  if (!match) return reply("⏰ Usage: remind 10m <msg>");
  
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const delay = parseInt(match[1]) * units[match[2]];

  if (delay > 2147483647) return reply("⚠️ Max reminder time is 24 days.");

  const reminder = {
    id: Date.now() + Math.random().toString(36).slice(2),
    userId: senderID,
    message: match[3],
    fireAt: Date.now() + delay
  };

  await db.addReminder(reminder);
  
  setTimeout(async () => {
      api.sendMessage(`⏰ **REMINDER**\n"${reminder.message}"`, senderID);
      await db.deleteReminder(reminder.id); // CLEANUP AFTER FIRING
  }, delay);

  reply(`✅ Reminder set for ${match[1]}${match[2]}.`);
};

// Start the reload on boot
loadReminders();
