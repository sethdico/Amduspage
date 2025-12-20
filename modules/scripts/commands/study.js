const axios = require("axios");

const studyVault = new Map();

// CONFIG FOR THE SPECIALIZED STUDY API
const STUDY_CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.STUDY_API_KEY, 
  MODEL_ID: "newapplication-10034686", 
  TIMEOUT: 120000
};

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "7.0", 
  category: "Education",
  description: "Academic Engine for Quizzes and Summaries.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const firstWord = args[0]?.toLowerCase();
  const materialInput = args.join(" ").trim();

  // --- LOGIC A: HANDLING THE ACTION (Button Clicks) ---
  if (["summarize", "quiz", "simplify"].includes(firstWord)) {
    const material = studyVault.get(senderID);
    
    if (!material) {
      return api.sendMessage("⚠️ **Session Expired.** Please type `study <topic>` again to refresh my memory!", senderID);
    }

    let taskType = firstWord.toUpperCase();
    if (taskType === "SIMPLIFY") taskType = "SIMPLIFY (ELI5)";

    api.sendTypingIndicator(true, senderID);

    try {
        const systemPrompt = `[ROLE]: Act as the Amdusbot Academic Engine. 
[PRIMARY DIRECTIVE]: Process the provided MATERIAL and output the requested TASK with ZERO conversational filler. Do not say "Hi", "Sure", or "Here is". Start IMMEDIATELY with the result.
[EXECUTION MODES]:
1. SUMMARIZE: Bullet points with **Bold** terms.
2. QUIZ: 3 Multiple Choice Questions (A, B, C, D). Questions ONLY.
3. SIMPLIFY: Creative analogy for a 5-year-old.
[MATERIAL]: ${material}
[TASK]: ${taskType}`;

        const response = await axios.post(STUDY_CONFIG.API_URL, {
            model: STUDY_CONFIG.MODEL_ID,
            messages: [{ role: "user", content: systemPrompt }],
            stream: false
        }, {
            headers: { "Authorization": `Bearer ${STUDY_CONFIG.API_KEY}` },
            timeout: STUDY_CONFIG.TIMEOUT
        });

        const result = response.data?.choices?.[0]?.message?.content;
        if (result) {
            await api.sendMessage(result, senderID);
        }

    } catch (e) {
        api.sendMessage("❌ Academic Engine Error. Check your Render Environment Variables.", senderID);
    } finally {
        api.sendTypingIndicator(false, senderID);
    }
    return;
  }

  // --- LOGIC B: DATA INTAKE (Typed 'study photosynthesis') ---
  if (materialInput && firstWord !== "summarize" && firstWord !== "quiz" && firstWord !== "simplify") {
    studyVault.set(senderID, materialInput);
    
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "study summarize" },
      { type: "postback", title: "❓ Quiz Me", payload: "study quiz" },
      { type: "postback", title: "👶 Simplify", payload: "study simplify" }
    ];

    const display = materialInput.length > 20 ? materialInput.substring(0, 20) + "..." : materialInput;
    return api.sendButton(`🎓 **Vault Locked: ${display}**\n\nI've memorized your notes. Select an option (I will respond immediately with no chatting!):`, buttons, senderID);
  }

  // --- LOGIC C: HELP ---
  api.sendMessage("🎓 **Amdusbot Study Toolkit**\nUsage: `study <topic or notes>`", senderID);
};
