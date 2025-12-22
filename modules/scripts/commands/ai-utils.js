const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ✅ Session storage
const SESSION_FILE = path.join(__dirname, "ai_sessions.json");
let sessions = {};

// Load sessions on startup
try {
  if (fs.existsSync(SESSION_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  }
} catch (e) {
  sessions = {};
}

// Save sessions periodically
function saveSessions() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error("Session save error:", e.message);
  }
}

// ✅ Session management functions
function getOrCreateSession(userId, aiName) {
  const key = `${userId}-${aiName}`;
  if (!sessions[key]) {
    sessions[key] = {
      messages: [],
      lastActivity: Date.now(),
      chatSessionId: null
    };
  }
  sessions[key].lastActivity = Date.now();
  return sessions[key];
}

function updateSession(userId, aiName, sessionData) {
  const key = `${userId}-${aiName}`;
  sessions[key] = {
    ...sessionData,
    lastActivity: Date.now()
  };
  saveSessions();
}

function clearSession(userId, aiName) {
  const key = `${userId}-${aiName}`;
  delete sessions[key];
  saveSessions();
}

// ✅ Cleanup old sessions (48 hours)
setInterval(() => {
  const now = Date.now();
  const maxAge = 48 * 60 * 60 * 1000;
  
  Object.keys(sessions).forEach(key => {
    if (now - sessions[key].lastActivity > maxAge) {
      delete sessions[key];
    }
  });
  
  saveSessions();
}, 30 * 60 * 1000); // Every 30 minutes

// ✅ Response extractor
function extractResponse(data) {
  return data.response || 
         data.result || 
         data.answer || 
         data.message || 
         data.text || 
         data.content || 
         "";
}

// ✅ Safe API call wrapper
async function safeApiCall(url, params = {}, timeout = 30000) {
  try {
    const response = await axios.get(url, {
      params,
      timeout,
      headers: { "User-Agent": "Mozilla/5.0 Amdusbot/3.0" },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isTimeout: error.code === "ECONNABORTED",
      statusCode: error.response?.status
    };
  }
}

// ✅ Format and SEND AI response (fixed signature)
async function formatAIResponse(content, senderID, api, title = "🤖 AI") {
  if (!content || !content.trim()) {
    await api.sendMessage("❌ Empty response received.", senderID);
    return;
  }
  
  const msg = `${title}\n───────────────\n${content}\n───────────────`;
  await api.sendMessage(msg, senderID);
}

// ✅ Stream decoder for Quillbot-style responses
function decodeStreamResponse(rawStream) {
  if (!rawStream || !rawStream.includes("event: output_done")) {
    return null;
  }

  try {
    const splitStream = rawStream.split("event: output_done");
    const dataPart = splitStream[1].split("data: ")[1];
    const jsonString = dataPart.split("event: status")[0].trim();
    const parsedData = JSON.parse(jsonString);
    return parsedData.text || null;
  } catch (e) {
    return null;
  }
}

// ✅ Typing indicator wrapper
async function withTyping(senderID, callback, api) {
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
  try {
    await callback();
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
}

// ✅ Error handler
async function handleAPIError(error, senderID, api, aiName = "AI") {
  let msg = `❌ ${aiName} Error: `;
  
  if (error.code === "ECONNABORTED") {
    msg += "Request timeout. Try again.";
  } else if (error.response?.status === 429) {
    msg += "Too many requests. Wait a moment.";
  } else if (error.response?.status >= 500) {
    msg += "Service temporarily down.";
  } else {
    msg += "Connection failed.";
  }
  
  await api.sendMessage(msg, senderID);
}

// ✅ Extract URLs from text
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

module.exports = {
  extractResponse,
  safeApiCall,
  formatAIResponse,
  decodeStreamResponse,
  withTyping,
  handleAPIError,
  extractUrls,
  getOrCreateSession,
  updateSession,
  clearSession
};
