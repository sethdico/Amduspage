const axios = require("axios");
module.exports = function (event) {
  return async function getUserInfo(id) {
    const uid = id || event.sender.id;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${uid}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`,
        { timeout: 5000 }
      );
      if (!res.data || res.data.error) return { name: "Messenger User", pic: null };
      return {
        name: `${res.data.first_name || ""} ${res.data.last_name || ""}`.trim() || "Messenger User",
        pic: res.data.profile_pic
      };
    } catch (e) {
      return { name: "Messenger User", pic: null }; 
    }
  };
};
