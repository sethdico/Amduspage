const axios = require("axios");
const crypto = require("crypto");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const psid = id || event.sender.id;
    const token = global.PAGE_ACCESS_TOKEN;
    const secret = process.env.JTOOL_SECRET;

    try {
      const graph = await axios.get(`https://graph.facebook.com/${psid}?fields=profile_pic&access_token=${token}`);
      const picUrl = graph.data?.profile_pic;
      if (!picUrl || picUrl.includes("fbsbx.com")) return { name: "messenger user", pic: picUrl };

      const uidMatch = picUrl.match(/(\d+)_/);
      const realUid = uidMatch ? uidMatch[1] : null;

      if (realUid && secret) {
        const payload = { link: realUid, type: 'basic' };
        const timestamp = Date.now().toString();
        const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

        const stalk = await axios.post('https://jrmtool-api.vercel.app/api/fb-stalk', payload, {
          headers: { 'Content-Type': 'application/json', 'X-Api-Timestamp': timestamp, 'X-Api-Signature': signature },
          timeout: 5000
        });

        if (stalk.data?.name) {
          return { name: stalk.data.name.toLowerCase(), pic: picUrl };
        }
      }
      return { name: "messenger user", pic: picUrl };
    } catch (e) {
      return { name: "messenger user", pic: null };
    }
  };
};
