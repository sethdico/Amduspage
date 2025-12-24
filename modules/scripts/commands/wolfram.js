const axios = require("axios");

module.exports.config = {
    name: "wolfram",
    aliases: ["wa", "calc", "math"],
    author: "Sethdico",
    version: "2.0-Smart",
    category: "Utility",
    description: "Advanced Computational Knowledge (Math, Science, Facts).",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const input = args.join(" ");
    if (!input) return api.sendMessage("🧮 Usage: wolfram <query>\nEx: wolfram integrate x^2\nEx: wolfram distance to mars", event.sender.id);

    // Visual Feedback
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    const APP_ID = "838ELRKJ9J";

    try {
        // Fetch JSON result
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(input)}&output=json`;
        const response = await axios.get(url, { timeout: 20000 });
        const data = response.data.queryresult;

        // 1. Handle "No Success" (Typos or Unknown)
        if (data.success === false) {
            if (data.didyoumeans) {
                const suggestions = data.didyoumeans.map(d => d.val).join("\n• ");
                return api.sendMessage(`❌ Check your spelling.\n🤔 **Did you mean:**\n• ${suggestions}`, event.sender.id);
            }
            return api.sendMessage("❌ Wolfram Alpha couldn't understand that query.", event.sender.id);
        }

        // 2. Data Extraction
        let inputInterp = "Query";
        let resultText = "";
        let resultImage = "";
        let extraInfo = "";

        // Iterate through "Pods" (Categories of answers)
        for (const pod of data.pods) {
            
            // A. Get the Input Interpretation (What Wolfram thought you said)
            if (pod.title === "Input" || pod.title === "Input interpretation") {
                inputInterp = pod.subpods[0].plaintext;
            }

            // B. Find the Primary Result (The Answer)
            // We look for 'primary' flag OR specific titles
            if (pod.primary === true || pod.title === "Result" || pod.title === "Decimal approximation" || pod.title === "Exact result") {
                resultText = pod.subpods[0].plaintext;
                // If text is empty/boring, grab the image (common for math formulas)
                if (!resultText) resultImage = pod.subpods[0].img.src;
            }

            // C. Look for Graphs/Plots (If we haven't found an image yet)
            if (!resultImage && (pod.title.includes("Plot") || pod.title.includes("Graph"))) {
                resultImage = pod.subpods[0].img.src;
            }
        }

        // Fallback: If no "Primary" pod was flagged, take the second pod (usually the answer)
        if (!resultText && !resultImage && data.pods.length > 1) {
            const fallbackPod = data.pods[1];
            resultText = fallbackPod.subpods[0].plaintext;
            resultImage = fallbackPod.subpods[0].img.src;
            extraInfo = `(${fallbackPod.title})`;
        }

        // 3. Construct the Message
        const cleanInput = inputInterp.length > 100 ? inputInterp.substring(0, 100) + "..." : inputInterp;
        const cleanResult = resultText || "Check the image below.";

        const msg = `🧮 **Wolfram Alpha**\n━━━━━━━━━━━━━━━━\n📥 **Input:** ${cleanInput}\n\n📤 **Result:** ${extraInfo}\n${cleanResult}`;

        // 4. Create "View on Web" Button (For complex steps)
        // Note: Wolfram allows viewing the query on their site
        const webUrl = `https://www.wolframalpha.com/input/?i=${encodeURIComponent(input)}`;
        const buttons = [
            {
                type: "web_url",
                url: webUrl,
                title: "🌐 Full Details"
            }
        ];

        // 5. Send Response
        // Send the Text + Button first
        await api.sendButton(msg, buttons, event.sender.id);

        // If there is a chart/graph/formula image, send it separately
        if (resultImage) {
            await api.sendAttachment("image", resultImage, event.sender.id);
        }

    } catch (e) {
        console.error("Wolfram Error:", e.message);
        api.sendMessage("❌ Connection timed out or API limit reached.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
