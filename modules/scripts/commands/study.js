const axios = require("axios");

const studyVault = new Map();

const STUDY_CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.STUDY_API_KEY, 
  MODEL_ID: "newapplication-10034686", 
  TIMEOUT: 120000
};

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "6.0", 
  category: "Education",
  description: "Academic Engine for Quizzes and Summaries.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const trigger = args[0]?.toUpperCase();
  const materialInput = args.join(" ").trim();

  // --- MODE A: BUTTON CLICKS ---
  if (trigger && trigger.startsWith("MODE_")) {
    const material = studyVault.get(senderID);
    if (!material) return api.sendMessage("⚠️ Session expired. Please re-paste your notes!", senderID);

    let taskType = "";
    if (trigger === "MODE_SUM") taskType = "SUMMARIZE";
    if (trigger === "MODE_QUIZ") taskType = "QUIZ";
    if (trigger === "MODE_ELI5") taskType = "SIMPLIFY (ELI5)";

    api.sendTypingIndicator(true, senderID);

    try {
        const systemPrompt = `[ROLE]: Amdusbot Academic Engine. 
[DIRECTIVE]: Process the MATERIAL and output the TASK with NO conversational filler. No "Hi", no "Sure". Start IMMEDIATELY with the result.
[MODES]: 1. SUMMARIZE (Bullet points). 2. QUIZ (3 MCQs A,B,C,D). 3. SIMPLIFY (Analogy).
MATERIAL: ${material}
TASK: ${taskType}`;

        const response = await axios.post(STUDY_CONFIG.API_URL, {
            model: STUDY_CONFIG.MODEL_ID,
            messages: [{ role: "user", content: systemPrompt }],
            stream: false
        }, {
            headers: { "Authorization": `Bearer ${STUDY_CONFIG.API_KEY}` },
            timeout: STUDY_CONFIG.TIMEOUT
        });

        const result = response.data?.choices?.[0]?.message?.content;
        if (result) await api.sendMessage(result, senderID);

    } catch (e) {
        api.sendMessage("❌ Engine Error. Check your STUDY_API_KEY in Render.", senderID);
    } finally {
        api.sendTypingIndicator(false, senderID);
    }
    return;
  }

  // --- MODE B: DATA INTAKE (Typed 'study ...') ---
  if (materialInput && materialInput.toLowerCase() !== "study") {
    studyVault.set(senderID, materialInput);
    
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "study MODE_SUM" },
      { type: "postback", title: "❓ Quiz Me", payload: "study MODE_QUIZ" },
      { type: "postback", title: "👶 Simplify", payload: "study MODE_ELI5" }
    ];

    return api.sendButton("🎓 **Academic Engine Active**\nI've memorized your material. Choose a mode:", buttons, senderID);
  }

  // --- MODE C: HELP ---
  api.sendMessage("🎓 Usage: `study <topic or notes>`", senderID);
};
