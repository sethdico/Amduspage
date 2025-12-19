module.exports.config = {
  name: "owner",
  author: "Sethdico",
  version: "1.1",
  category: "Utility",
  description: "Contact the owner",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event }) {
  const buttons = [
    {
      type: "web_url",
      url: "https://www.facebook.com/seth09asher", // ✅ Updated Link
      title: "Add Seth"
    },
    {
      type: "web_url",
      url: "https://github.com/sethdico",
      title: "GitHub"
    }
  ];

  try {
      await api.sendButton(
        "👑 **Bot Owner**\n━━━━━━━━━━━━━━━━\nThis bot was created by Seth Asher Salinguhay.\nContact me for issues:",
        buttons,
        event.sender.id
      );
  } catch (e) {
      // Fallback message if buttons fail (e.g. on some mobile versions)
      api.sendMessage("👑 **Owner:** Seth Asher Salinguhay\nFB: facebook.com/seth09asher", event.sender.id);
  }
};
