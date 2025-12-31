const axios = require("axios");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const uid = id || event.sender.id;
    try {
      // just get the basic info
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${uid}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`
      );
      
      const { first_name, last_name, profile_pic } = res.data;
      return {
        name: `${first_name || "fb"} ${last_name || "user"}`.trim(),
        pic: profile_pic
      };
    } catch (e) {
      return { name: "user", pic: null };
    }
  };
};
