<div align="center">

<img src="https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif" width="600">

# AMDUSPAGE

<<<<<<< HEAD
  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

  <p style="font-size: 1.1rem; color: #555;">
    <b>Messenger Pagebot.</b><br>
    Easy to set up and use.<br>
    Built by a solo dev
  </p>
=======
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Optimized Messenger Pagebot.**  
Easy to set up and customize for your own page.  
Built by a solo dev
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f

Created by **[Seth Asher Salinguhay](https://www.facebook.com/seth09asher)**

</div>

---

## 📋 Table of Contents
- [📂 Project Structure](#-project-structure)
<<<<<<< HEAD
- [🛠️ Setup & Configuration](#️-setup--configuration)
- [🚀 Deployment](#-deployment)
- [🤖 Features](#-features)
- [🚀 Try the Bot](#-try-the-bot)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [⚠️ FAQ](#-faq)
- [🛠️ Support](#️-support)
=======
- [🛠️ Setup](#-setup)
- [🚀 Deployment](#-deployment)
- [🤖 Commands](#-commands)
- [📄 License](#-license)
- [👍 Like & Review](#-like--review)
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f

---

## 📂 Project Structure

<<<<<<< HEAD
Simple and organized structure.

| Directory | What it does |
| :--- | :--- |
| `modules/commands/` | Bot commands (AI, Media, Fun, Admin) |
| `modules/core/` | Database, cache, and system core |
| `modules/middleware/` | Security and rate limiting |
| `modules/utils/` | Helper functions |
| `page/src/` | Facebook API tools |
| `config/` | Configuration files |
| `cache/` | Temporary storage |
| `tests/` | Test files |
| `index.js` | Main app file |
| `webhook.js` | Facebook webhook handler |
=======
| Directory | Description |
| :--- | :--- |
| `modules/commands/` | Bot Logic (AI, Media, Fun, Utility, Admin commands) |
| `modules/core/` | System Core (Database, Cache & Queue Managers) |
| `modules/middleware/` | Security (Rate limiting & Input Validation) |
| `modules/utils/` | Utilities (Helper functions and tools) |
| `page/src/` | Interface (Facebook API Wrappers) |
| `config/` | Configuration (API Endpoints & Constants) |
| `index.js` | Entry Point (Main Application File) |
| `webhook.js` | Webhook Handler (Facebook Messenger webhook processing) |
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f

---

## 🛠️ Setup

### Requirements
- **Node.js** >= 16.0.0
- **MongoDB** (optional but recommended)

### Installation
1. Clone the repository
<<<<<<< HEAD
2. Run `npm install`
3. Set up environment variables
4. Start with `node index.js`

### Environment Variables
Set these in your hosting environment or `.env` file.

<details>
<summary><b>Required variables</b></summary>

| Variable | What it's for |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `VERIFY_TOKEN` | Webhook verification |
| `ADMINS` | Admin user IDs (comma separated) |

</details>

<details>
<summary><b>Optional variables</b></summary>

| Variable | What it's for |
| :--- | :--- |
| `MONGODB_URI` | MongoDB connection |
| `OPENAI_API_KEY` | OpenAI API |
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port (default: 8080) |

</details>
=======
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start: `node index.js`

### Environment Variables
```env
PAGE_ACCESS_TOKEN=your_token
VERIFY_TOKEN=your_verify_token
MONGODB_URI=your_mongodb_uri
ADMINS=your_facebook_id
```
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f

---

## 🚀 Deployment

```bash
npm install
node index.js
```

**3. Set up Facebook Webhook**
- Point your webhook to `https://your-domain.com/webhook`
- Subscribe to `messages` and `messaging_postbacks`

---

<<<<<<< HEAD
## 🤖 Features

### 🧠 AI Commands
- `amdus <query>` - Main AI with image analysis
- `gemini <query>` - Google Gemini with vision
- `copilot <prompt>` - Microsoft Copilot with web search
- `perplexity <query>` - Deep reasoning AI
- `venice <query>` - Precise AI model
- `webpilot <query>` - Web search AI
- `you <query>` - You.com AI search
- `sim <message>` - SimSimi chatbot

### 🎬 Media Tools
- `alldl <url>` - Download from Facebook, TikTok, YouTube, etc.
- `pinterest <query>` - Image search
- `screenshot <url>` - Website screenshot
- `dalle <prompt>` - AI image generation
- `gmage <query>` - Google image search
- `lyrics <song>` - Song lyrics
- `nasa` - NASA photo of the day

### 🛠️ Utilities
- `tempmail` - Disposable email with inbox
- `remind <time> <msg>` - Set reminders (e.g., `10m sleep`)
- `trans <lang> <text>` - Translate text
- `dict <word>` - Dictionary definitions
- `google <query>` - Google search
- `wiki <topic>` - Wikipedia search
- `wolfram <query>` - Math and science answers
- `pokemon <name>` - Pokémon info
- `joke` - Random jokes
- `48laws <number>` - 48 Laws of Power

### 🛡️ Admin Commands
- `stats` - System stats and metrics
- `getuser` - User database search
- `ban <id>` / `unban <id>` - User management
- `broadcast <msg>` - Send message to all users
- `maintenance on/off` - Toggle maintenance mode
- `transcript <session_id>` - View conversation logs
- `clean` - Clear cache files
- `cmd on/off <name>` - Enable/disable commands

---

## 🚀 Try the Bot

Want to test it? Message the bot directly:  
👉 **[Amduspage Bot](https://www.facebook.com/profile.php?id=61585331824038)**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
=======
## 🤖 Commands

### 🧠 Artificial Intelligence
- `amdus` — Main AI engine with image analysis
- `gemini` — Google Gemini integration
- `copilot` — Microsoft Copilot with web search
- `perplexity` — Deep reasoning AI
- `venice` — Precise AI model
- `webpilot` — Web search AI assistant
- `you` — You.com AI search
- `sim` — SimSimi chatbot

### 🎬 Media Tools
- `alldl` — Universal media downloader
- `pinterest` — Image search
- `screenshot` — Website preview capture
- `dalle` — AI image generation
- `gmage` — Google image search
- `lyrics` — Song lyrics fetcher
- `nasa` — NASA space photo of the day

### 🛠️ Utilities
- `tempmail` — Disposable email generator
- `remind` — Scheduled reminders
- `trans` — Text translation with audio
- `dict` — Dictionary and slang definitions
- `google` — Google web search
- `wiki` — Wikipedia search
- `wolfram` — Computational knowledge
- `pokemon` — Pokédex lookup
- `joke` — Random jokes
- `48laws` — 48 Laws of Power

### 🛡️ Administration
- `stats` — System metrics
- `getuser` — User database management
- `ban/unban` — User access control
- `broadcast` — Global announcements
- `maintenance` — Toggle maintenance mode
- `cmd` — Enable/disable commands
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f

---

## 📄 License

<<<<<<< HEAD
MIT License. You're free to use, modify, and distribute this software.

---

## ⚠️ FAQ

**Q: How do I add my own commands?**  
A: Add `.js` files to `modules/commands/` following the existing structure.

### Command Template

```javascript
module.exports.config = {
    name: "commandname",
    author: "yourname",
    category: "Category",
    description: "What this command does",
    adminOnly: false,
    cooldown: 5
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    
    if (!query) {
        return reply("how to use: commandname <input>");
    }
    
    try {
        await api.sendMessage("Result here", event.sender.id);
    } catch (e) {
        reply("something went wrong");
    }
};
```

**Q: Bot is online but not replying?**  
A: Check your webhook setup and verify tokens in Facebook Developer portal.

---

## 🛠️ Support

If you need help:

1. **Missing Dependencies**: Run `npm install`
2. **Webhook Issues**: Verify your webhook is subscribed to messages
3. **Database Problems**: Check MongoDB connection settings

**Still need help? Message me:**  
💬 **[Seth Asher on Facebook](https://www.facebook.com/seth09asher)**

---

<div align="center">
    <br>
    Open-source by Sethdico
=======
MIT License — Free to use, modify, and distribute.

---

## 👍 Like & Review

If you find this project useful, please star the repository and follow the [Facebook page](https://www.facebook.com/profile.php?id=61585331824038).

<div align="center">
  <br>
  Open-source and maintained by Sethdico.
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f
</div>
