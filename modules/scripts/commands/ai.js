const axios = require("axios");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

// === PATHS & STORAGE ===
const CACHE_DIR = path.join(__dirname, "cache");
const SESSION_FILE = path.join(__dirname, "ai_sessions.json");

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY,
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 60000, // Reduced from 120000 to prevent hanging
  RATE_LIMIT: { requests: 15, windowMs: 60000 },
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  SESSION_MAX_AGE: 48 * 60 * 60 * 1000, // 48 hours
  SESSION_MAX_SIZE: 500,
  CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// === SECURITY & VALIDATION ===
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>&"'`]/g, '') // Remove potential XSS characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, 2000); // Limit length
}

function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'file.txt';
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow safe characters
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^[\.]|[\.]$/g, '') // Remove leading/trailing dots
    .substring(0, 100); // Limit length
}

function validateImageUrl(url) {
  if (typeof url !== 'string') return false;
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  return imageExtensions.test(url) && /^https?:\/\//.test(url);
}

function validateFileSize(buffer) {
  return buffer && buffer.length <= CONFIG.MAX_FILE_SIZE;
}

function validateBase64(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') return false;
  // More strict base64 validation to prevent ReDoS
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(base64Data) && base64Data.length > 0;
}

// === OPTIMIZED REGEX (Safe patterns to prevent ReDoS) ===
const REGEX = {
  YOUTUBE: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  CREATION: /\b(draw|paint|generate|create|render|sketch|illustrate)\b/i,
  ART_CONTEXT: /\b(image|art|wallpaper|logo|picture)\b/i,
  EDITING: /\b(edit|change|modify|remove|add|enhance|transform)\b/i,
  JSON_FILE: /\{[\s\n]*"fileName"[\s\n]*:[\s\n]*"([^"]{1,100})"[\s\n]*,[\s\n]*"fileBase64"[\s\n]*:[\s\n]*"([A-Za-z0-9+/]{1,10000})"[\s\n]*\}/,
  FILE_LINK: /(https?:\/\/[^)\s"<>]+\.(?:pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i
};

// === IMPROVED RATE LIMITING WITH MEMORY MANAGEMENT ===
const rateLimitStore = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId) || [];
  
  // Clean old timestamps and prune expired entries
  const recentTimestamps = userLimits.filter(
    ts => now - ts < CONFIG.RATE_LIMIT.windowMs
  );
  
  if (recentTimestamps.length >= CONFIG.RATE_LIMIT.requests) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitStore.set(userId, recentTimestamps);
  return true;
}

// Rate limit cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of rateLimitStore) {
    const validTimestamps = timestamps.filter(
      ts => now - ts < CONFIG.RATE_LIMIT.windowMs
    );
    
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(userId);
    } else {
      rateLimitStore.set(userId, validTimestamps);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

// === SESSION MANAGEMENT WITH FILE LOCKING ===
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSize = CONFIG.SESSION_MAX_SIZE;
    this.isSaving = false;
    this.loadSessions();
    this.startCleanup();
  }

  async loadSessions() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        // Add file locking for concurrent access
        await this.withFileLock(async () => {
          const data = await fsPromises.readFile(SESSION_FILE, "utf-8");
          const sessionData = JSON.parse(data);
          
          // Validate session data structure with better error handling
          let validCount = 0;
          for (const [userId, session] of Object.entries(sessionData)) {
            if (this.isValidSession(session)) {
              this.sessions.set(userId, session);
              validCount++;
            }
          }
          console.log(`📦 Loaded ${validCount} valid sessions`);
        });
      }
    } catch (e) {
      console.error("⚠️ Failed to load sessions:", e.message);
      // Backup corrupted file and start fresh
      try {
        await fsPromises.rename(SESSION_FILE, `${SESSION_FILE}.backup.${Date.now()}`);
      } catch (backupError) {
        console.error("Failed to backup corrupted session file:", backupError.message);
      }
      this.sessions = new Map();
    }
  }

  async withFileLock(operation) {
    const lockFile = `${SESSION_FILE}.lock`;
    const lockId = crypto.randomBytes(16).toString('hex');
    
    try {
      // Try to acquire lock with timeout
      const startTime = Date.now();
      while (fs.existsSync(lockFile)) {
        if (Date.now() - startTime > 5000) { // 5 second timeout
          throw new Error('Timeout acquiring file lock');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await fsPromises.writeFile(lockFile, lockId);
      
      // Verify we own the lock
      const lockContent = await fsPromises.readFile(lockFile, 'utf-8');
      if (lockContent !== lockId) {
        throw new Error('File lock lost');
      }
      
      return await operation();
    } finally {
      // Release lock
      try {
        const currentLock = await fsPromises.readFile(lockFile, 'utf-8');
        if (currentLock === lockId) {
          await fsPromises.unlink(lockFile);
        }
      } catch (e) {
        console.error("Failed to release file lock:", e.message);
      }
    }
  }

  isValidSession(session) {
    return session && 
           typeof session === 'object' && 
           typeof session.lastActivity === 'number' &&
           (session.chatSessionId === null || typeof session.chatSessionId === 'string');
  }

  get(userId) {
    const session = this.sessions.get(userId);
    if (!session) return null;
    
    // Check if session is expired
    if (Date.now() - session.lastActivity > CONFIG.SESSION_MAX_AGE) {
      this.delete(userId);
      return null;
    }
    
    session.lastActivity = Date.now();
    return session;
  }

  set(userId, session) {
    if (!this.isValidSession(session)) return false;
    
    // If at max capacity, remove oldest session
    if (this.sessions.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.sessions.delete(oldestKey);
      }
    }
    
    session.lastActivity = Date.now();
    this.sessions.set(userId, session);
    return true;
  }

  delete(userId) {
    return this.sessions.delete(userId);
  }

  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, session] of this.sessions) {
      if (session.lastActivity < oldestTime) {
        oldestTime = session.lastActivity;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  async save() {
    if (this.isSaving) return; // Prevent concurrent saves
    
    this.isSaving = true;
    try {
      await this.withFileLock(async () => {
        const sessionsObj = Object.fromEntries(this.sessions);
        const tempFile = `${SESSION_FILE}.tmp`;
        await fsPromises.writeFile(tempFile, JSON.stringify(sessionsObj, null, 2));
        await fsPromises.rename(tempFile, SESSION_FILE);
      });
    } catch (e) {
      console.error("⚠️ Failed to save sessions:", e.message);
    } finally {
      this.isSaving = false;
    }
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      for (const [userId, session] of this.sessions) {
        if (now - session.lastActivity > CONFIG.SESSION_MAX_AGE) {
          this.sessions.delete(userId);
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
        this.save();
      }
    }, CONFIG.CLEANUP_INTERVAL);
  }
}

const sessionManager = new SessionManager();

// === YOUTUBE THUMBNAIL HELPER ===
function sendYouTubeThumbnail(youtubeUrl, senderID, api) {
  try {
    const match = youtubeUrl.match(REGEX.YOUTUBE);
    if (match && match[1]) {
      const thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      api.sendAttachment("image", thumbnailUrl, senderID).catch(() => {});
    }
  } catch (error) {
    console.error("YouTube thumbnail error:", error.message);
  }
}

// === IMPROVED FILE HANDLING ===
async function saveAndSendFile(fileName, fileData, senderID, api, cleanMessage) {
  let fileHandle = null;
  let tempFilePath = null;
  
  try {
    let base64Data = fileData;
    
    // Extract base64 data if it's in data URL format
    if (base64Data.includes("base64,")) {
      base64Data = base64Data.split("base64,")[1];
    }
    
    // Enhanced base64 validation
    if (!validateBase64(base64Data)) {
      throw new Error("Invalid base64 data format");
    }
    
    const buffer = Buffer.from(base64Data, "base64");
    
    if (!validateFileSize(buffer)) {
      throw new Error("File size exceeds limit");
    }
    
    const sanitizedName = sanitizeFileName(fileName);
    tempFilePath = path.join(CACHE_DIR, `${Date.now()}_${sanitizedName}`);
    
    // Write to temporary file first
    fileHandle = await fsPromises.open(tempFilePath, 'w');
    await fileHandle.write(buffer);
    await fileHandle.close();
    fileHandle = null;
    
    // Determine file type
    const ext = path.extname(sanitizedName).toLowerCase();
    const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
    
    // Send message if there's text content
    if (cleanMessage) {
      await api.sendMessage(cleanMessage, senderID);
    }
    
    // Send file
    await api.sendAttachment(type, tempFilePath, senderID);
    
    // Clean up file after 1 minute
    setTimeout(async () => {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (e) {
        console.error("Failed to cleanup temp file:", e.message);
      }
    }, 60000);
    
    return true;
  } catch (error) {
    console.error("File handling error:", error.message);
    return false;
  } finally {
    // Ensure proper cleanup
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch (e) {
        console.error("Failed to close file handle:", e.message);
      }
    }
    if (tempFilePath) {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// === ENHANCED API CALL WITH RETRY LOGIC ===
async function callAI(userId, systemPrompt, userPrompt, imageUrl, retryCount = 0) {
  const session = sessionManager.get(userId);
  
  const messages = [{
    role: "user",
    content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}`
  }];
  
  const requestData = {
    model: CONFIG.MODEL_ID,
    messages: messages,
    stream: false
  };
  
  if (session?.chatSessionId) {
    requestData.chatSessionId = session.chatSessionId;
  }
  
  try {
    const response = await axios.post(CONFIG.API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${CONFIG.API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: CONFIG.TIMEOUT
    });
    
    if (!response.data || (!response.data.choices?.[0]?.message?.content && !response.data.message)) {
      throw new Error("Empty or invalid API response");
    }
    
    // Update session
    if (response.data.chatSessionId) {
      sessionManager.set(userId, { chatSessionId: response.data.chatSessionId, lastActivity: Date.now() });
      sessionManager.save();
    }
    
    return response.data.choices?.[0]?.message?.content || response.data.message;
  } catch (error) {
    // Retry logic for transient errors
    if (retryCount < CONFIG.MAX_RETRIES && 
        (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status >= 500)) {
      console.log(`Retrying API call (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (retryCount + 1)));
      return callAI(userId, systemPrompt, userPrompt, imageUrl, retryCount + 1);
    }
    
    throw error;
  }
}

// === MAIN MODULE ===
module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "33.0-Optimized",
  category: "AI",
  description: "Advanced AI by SethDico - Now with improved security, error handling, and optimization.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender?.id;
  const mid = event.message?.mid;
  
  if (!senderID) {
    console.error("❌ Missing sender ID");
    return;
  }
  
  // Validate configuration
  if (!CONFIG.API_KEY) {
    return api.sendMessage("❌ Missing CHIPP_API_KEY.", senderID);
  }
  
  // Rate limiting
  if (!checkRateLimit(senderID)) {
    return api.sendMessage("⏳ High traffic! Please slow down.", senderID);
  }
  
  // Sanitize input
  const userPrompt = sanitizeInput(args.join(" "));
  const isSticker = !!event.message?.sticker_id;
  
  // Handle image attachments
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload?.url || "";
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload?.url || "";
  }
  
  // Validate image URL
  if (imageUrl && !validateImageUrl(imageUrl)) {
    imageUrl = "";
  }
  
  // Handle special commands
  if (userPrompt.toLowerCase() === "clear") {
    sessionManager.delete(senderID);
    await sessionManager.save();
    return api.sendMessage("🧹 Session reset.", senderID);
  }
  
  // Skip sticker-only messages
  if (isSticker && !userPrompt) return;
  
  // Handle empty input
  if (!userPrompt && !imageUrl) {
    return api.sendMessage("👋 I'm Amdusbot. Ask me anything!", senderID);
  }
  
  // Handle YouTube URLs
  if (userPrompt && REGEX.YOUTUBE.test(userPrompt)) {
    sendYouTubeThumbnail(userPrompt, senderID, api);
  }
  
  // Show typing indicator
  if (api.sendTypingIndicator) {
    api.sendTypingIndicator(true, senderID).catch(() => {});
  }
  
  try {
    // Analyze input for creative mode
    const isCreation = REGEX.CREATION.test(userPrompt) && REGEX.ART_CONTEXT.test(userPrompt);
    const isEditing = imageUrl && REGEX.EDITING.test(userPrompt);
    
    let systemPrompt = `[IDENTITY]: You are Amdusbot, created by Seth Asher Salinguhay.
[LANGUAGE]: Detect the user's language and respond in the same language.
[FILE FORMAT]: If asked to generate a file, output ONLY JSON: {"fileName": "x.txt", "fileBase64": "data:..."}
[SECURITY]: Do not execute code or perform system operations.`;
    
    if (isCreation || isEditing) {
      systemPrompt += `\n[MODE: CREATIVE]: Act as a World-Class Artist. Use descriptive art language.`;
    } else {
      systemPrompt += `\n[MODE: ANALYTICAL]: Use Tree of Thoughts (ToT). Verify facts. Output ONLY final response.`;
    }
    
    // Call AI with improved error handling
    const replyContent = await callAI(senderID, systemPrompt, userPrompt, imageUrl);
    
    if (!replyContent || typeof replyContent !== 'string') {
      throw new Error("No valid content received from AI");
    }
    
    // Handle file generation with improved regex matching
    const jsonMatch = replyContent.match(REGEX.JSON_FILE);
    if (jsonMatch) {
      const fileName = jsonMatch[1];
      const fileData = jsonMatch[2];
      const cleanMessage = replyContent.replace(jsonMatch[0], "").replace(/```json|```/g, "").trim();
      
      const success = await saveAndSendFile(fileName, fileData, senderID, api, cleanMessage);
      if (!success) {
        await api.sendMessage("❌ Failed to process file. Please try again.", senderID);
      } else if (api.setMessageReaction && mid) {
        api.setMessageReaction("✅", mid).catch(() => {});
      }
      return;
    }
    
    // Handle file links
    const linkMatch = replyContent.match(REGEX.FILE_LINK);
    if (linkMatch) {
      const fileUrl = linkMatch[0].replace(/[).,]+$/, "");
      const textMessage = replyContent.replace(linkMatch[0], "").trim();
      
      if (textMessage) {
        await api.sendMessage(textMessage, senderID);
      }
      
      const ext = path.extname(fileUrl).toLowerCase();
      const type = [".jpg", ".jpeg", ".png", ".gif"].includes(ext) ? "image" : "file";
      
      await api.sendAttachment(type, fileUrl, senderID);
    } else {
      // Send regular message
      await api.sendMessage(replyContent, senderID);
    }
    
    if (api.setMessageReaction && mid) {
      api.setMessageReaction("✅", mid).catch(() => {});
    }
    
  } catch (error) {
    console.error("AI ERROR:", error.message);
    
    // Provide user-friendly error messages with better categorization
    let errorMessage = "❌ Failed to process. Please try again.";
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = "⏰ Request timeout. Please try with a shorter message.";
    } else if (error.response?.status === 429) {
      errorMessage = "🔄 Too many requests. Please wait a moment.";
    } else if (error.response?.status === 401) {
      errorMessage = "🔐 Authentication error. Please contact admin.";
    } else if (error.response?.status >= 500) {
      errorMessage = "🔧 Server error. Please try again later.";
    } else if (error.message.includes("Invalid base64")) {
      errorMessage = "📄 File processing error. Please try a different file.";
    }
    
    try {
      await api.sendMessage(errorMessage, senderID);
    } catch (e) {
      console.error("Failed to send error message:", e.message);
    }
  } finally {
    // Hide typing indicator
    if (api.sendTypingIndicator) {
      api.sendTypingIndicator(false, senderID).catch(() => {});
    }
  }
};
