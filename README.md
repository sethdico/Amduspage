# 🤖 Amdusbot (V10.0)
**Multi-AI Facebook Messenger Bot**

Built on the Pagebot Framework, Amdusbot is a smart AI assistant that handles natural conversation, vision analysis, and document generation.

## 🚀 Features
- **Natural Chat**: Talk to the bot like a human. No command prefix needed for AI interaction.
- **Vision AI**: Send images to describe, analyze, or extract text.
- **Smart Downloader**: Generates and sends real files (.pdf, .docx, .txt, .xlsx) directly to Messenger.
- **YouTube Summarizer**: Paste a link to get a quick summary and video thumbnail.
- **Web Search**: Real-time info retrieval with cited links.

## 🛠️ Setup Instructions
1. **Host on Render**: Connect your GitHub repo to a Render Web Service.
2. **Set Secrets**: Add these Environment Variables in Render:
   - `PAGE_ACCESS_TOKEN`: Your FB Page Token.
   - `CHIPP_API_KEY`: Your Chipp.ai API Key.
   - `VERIFY_TOKEN`: Your password for the webhook connection.
3. **Webhook**: Use `https://your-app.onrender.com/webhook` in the Meta Developer Portal.

## 📖 How it Works
- **Handler**: The bot checks for specific commands first. If none match, it forwards the text to `ai.js`.
- **Session Memory**: Uses a local Map and `chatSessionId` to remember the context of your conversation.
- **Cache**: Automatically downloads files to a temporary folder, sends them, and deletes them after 60 seconds to maintain server health.

## 👑 Credits
Developed by **Seth Asher Salinguhay (Sethdico)**.
