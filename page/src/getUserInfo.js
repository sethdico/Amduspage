const axios = require("axios");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const userID = id || event.sender.id;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${userID}?fields=name,first_name,last_name,profile_pic,gender,birthday,link,locale,timezone&access_token=${global.PAGE_ACCESS_TOKEN}`
      );
      return res.data;
    } catch (e) {
      return { name: "Unknown User", first_name: "User" };
    }
  };
};
