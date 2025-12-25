module.exports.config = { name: "uid", category: "Utility" };
module.exports.run = async ({ event, api, reply }) => {
  const id = event.sender.id;
  try {
    const info = await api.getUserInfo(id);
    const name = `${info.first_name} ${info.last_name}`;
    reply(`🆔 **User Info**\nName: ${name}\nID: ${id}`);
    if (info.profile_pic) api.sendAttachment("image", info.profile_pic, id);
  } catch (e) { reply(`🆔 ID: ${id}`); }
};
