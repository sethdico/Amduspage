const axios = require("axios");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const userID = id || event.sender.id;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${userID}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`
      );
      return res.data;
    } catch (e) {
      return { first_name: "User", last_name: "", profile_pic: "" };
    }
  };
};
