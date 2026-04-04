module.exports.config = {
    name: "owner",
    author: "sethdico",
    version: "2.2",
    category: "Utility",
    description: "bot developer info",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, api, args }) {
  const id = event.sender.id;
  const gifUrl = "https://media1.tenor.com/m/7FNLn9ZzxDgAAAAC/urabe-mikoto-mystery-girlfriend-x.gif";
  
  const msg = `𝗦𝗘𝗧𝗛 𝗔𝗦𝗛𝗘𝗥 𝗦𝗔𝗟𝗜𝗡𝗚𝗨𝗛𝗔𝗬

bot developer & maintainer`;

  const buttons = [
    { type: "web_url", url: "https://facebook.com/seth09asher", title: "facebook" },
    { type: "web_url", url: "https://github.com/sethdico", title: "github" }
  ];

  try {
    await api.sendAttachment("image", gifUrl, id);
    await api.sendButton(msg.toLowerCase(), buttons, id);
  } catch (e) {
    api.sendMessage("seth asher salinguhay\nfb: seth09asher\ngithub: sethdico", id);
  }
};
