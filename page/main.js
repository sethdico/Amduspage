const utils = require("../modules/utils");
const handler = require("./handler"); // Bridge to logic
const http = utils.http;

const graphUrl = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;

// 1. Define API Functions
const api = {
    sendMessage: (text, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { text } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendButton: (text, buttons, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "button", text, buttons } } } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendAttachment: (type, url, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { attachment: { type: type === "image" ? "image" : "file", payload: { url } } } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendTypingIndicator: (state, id) => http.post(graphUrl(id), { sender_action: state ? "typing_on" : "typing_off" }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendQuickReply: (text, quickReplies, id) => http.post(graphUrl(id), {
        messaging_type: "RESPONSE",
        message: {
            text,
            quick_replies: quickReplies.map(q => ({ content_type: "text", title: q, payload: q }))
        }
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendCarousel: async (elements, id) => {
        try {
             await http.post(graphUrl(id), { 
                recipient: { id }, 
                message: { attachment: { type: "template", payload: { template_type: "generic", elements: elements.slice(0, 10) } } } 
            }, { params: { access_token: global.PAGE_ACCESS_TOKEN }});
        } catch (e) { console.error("Carousel error"); }
    },
    getUserInfo: async (id) => {
        try {
            const res = await http.get(`https://graph.facebook.com/${id}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`);
            return res.data;
        } catch (e) { return { first_name: "User" }; }
    }
};

// 2. Main Handler: Pass control to handler.js
module.exports = async (event) => {
    try {
        await handler(event, api);
    } catch (e) {
        console.error("Handler Error:", e.message);
    }
};

// 3. Export API (Required for remind.js to work)
module.exports.api = api;
