Repository: https://github.com/YANDEVA/Pagebot
Files analyzed: 26

Directory structure:
└── YANDEVA-Pagebot/
    ├── modules
    │   ├── scripts
    │   │   ├── commands
    │   │   │   ├── buttons.js
    │   │   │   ├── get.js
    │   │   │   ├── gpt.js
    │   │   │   ├── greet.js
    │   │   │   ├── help.js
    │   │   │   └── image.js
    │   │   └── events
    │   │       ├── sample.js
    │   │       └── script.js
    │   └── utils.js
    ├── page
    │   ├── src
    │   │   ├── graph.js
    │   │   ├── markAsSeen.js
    │   │   ├── sendAttachment.js
    │   │   ├── sendButton.js
    │   │   ├── sendMessage.js
    │   │   ├── sendTypingIndicator.js
    │   │   └── setMessageReaction.js
    │   ├── handler.js
    │   └── main.js
    ├── website
    │   ├── index.html
    │   ├── script.js
    │   └── web.js
    ├── .gitignore
    ├── .replit
    ├── DOCS.md
    ├── index.js
    ├── LICENSE.md
    ├── README.md
    ├── replit.nix
    └── webhook.js


================================================
FILE: DOCS.md
================================================
# API Documentation
## Basic Messaging

### `api.sendMessage(message, senderID)`

Sends a text message to a specified user.

#### Parameters:
- `message` (string): The message to send.
- `senderID` (string): The ID of the message recipient.

#### Usage:
```javascript
api.sendMessage("Hello", event.sender.id);
```

or, with a promise:
```javascript
api.sendMessage("Hello", event.sender.id).then((res) => {
  console.log(res).catch((err) => {
    console.error(err);
  });
});
```

---

### `api.sendTypingIndicator(isTyping, senderID)`

Activates or deactivates the typing indicator for a user.

#### Parameters:
- `isTyping` (boolean): Set to `true` to show the typing indicator, or `false` to hide it.
- `senderID` (string): The ID of the user for whom the typing indicator is being set.

#### Usage:
Enable the typing indicator:
```javascript
api.sendTypingIndicator(true, event.sender.id);
```

Disable the typing indicator:
```javascript
api.sendTypingIndicator(false, event.sender.id);
```

or, with a promise:
```javascript
api.sendTypingIndicator(false, event.sender.id).then((res) => {
  console.log(res);
}).catch((err) => {
  console.error(err);
});
```

---

# API Button Sender

A simple and flexible API for sending buttons (text buttons, URL buttons, postback buttons) to users on Facebook Messenger. This function allows you to send a rich message that includes interactive buttons like `Call to Action` buttons.

## Usage

The `api.sendButton` function allows you to send interactive buttons that a user can click, leading to a postback event or opening a URL.

### Example Usage:

```javascript
// Sending a single button
const buttons = [
  {
    type: "web_url",
    title: "Visit Website",
    url: "https://www.facebook.com/yandeva.me",
  },
];

api.sendButton("Here is a button!", buttons, senderID)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Sending multiple buttons (e.g., postback buttons)
const postback = [
  {
    type: "postback",
    title: "Click Me!",
    payload: "USER_CLICKED_BUTTON",
  },
  {
    type: "web_url",
    title: "Visit Website",
    url: "https://www.facebook.com/yandeva.me",
  },
  {
    type: "web_url",
    title: "Chat Me",
    url: "m.me/pekoai",
  },
];

api.sendButton("Click a button!", postback, senderID)
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### Supported Button Types

- **`web_url`**: Opens a URL when clicked (ideal for external links).
- **`postback`**: Sends a postback event when clicked (ideal for triggering specific bot actions).

### Parameters

- **`messageText`** (string): The text content that accompanies the buttons. This can include any message you want the user to see along with the buttons.
- **`buttons`** (array): An array of buttons to send, where each button is an object containing:
  - **`type`** (string): The button type. Can be one of:
    - `'web_url'`: A button that opens a URL.
    - `'postback'`: A button that sends a postback to the bot.
  - **`title`** (string): The text to display on the button.
  - **`url`** (string, optional): The URL to open when the button is clicked. Required for `web_url` type buttons.
  - **`payload`** (string, optional): The payload to send when the button is clicked. Required for `postback` type buttons.
- **`senderID`** (string): The ID of the recipient. If not provided, it will use the sender ID from the event.

### Response

The function returns a promise that resolves with the response from the Facebook Graph API, which will contain information about the sent message or an error if something goes wrong.

### Example Response:

```json
{
  "recipient_id": "123456789",
  "message_id": "m_123456789"
}
```

## Notes

- **Buttons Layout**: You can send a maximum of 3 buttons per message. If you need to send more, consider breaking the message into multiple parts or creating a more complex button template.

- **Button Limitations**: Only `web_url` and `postback` are supported as button types. The payload for `postback` buttons should be a string that you can use to trigger specific actions in your bot.

- **Access Tokens**: Ensure that your `PAGE_ACCESS_TOKEN` is properly set up. This token is required for authenticating requests to the Facebook Graph API.

---

# API Attachment Sender

A simple and flexible API for sending various types of attachments (file, image, audio, video, etc.) via Facebook Messenger using the Graph API. This function supports sending both file uploads and URL-based attachments.

## Usage

The `api.sendAttachment` function is used to send different types of attachments, including files, images, audio, and video, to a recipient via Facebook Messenger.

### Example Usage:

```javascript
// Sending a file
api.sendAttachment('file', 'path/to/your/file.pdf', event.sender.id)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Sending an image URL
api.sendAttachment('image', 'https://example.com/image.jpg', event.sender.id)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Sending an audio URL
api.sendAttachment('audio', 'https://example.com/audio.mp3', event.sender.id)
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Sending a video URL
api.sendAttachment('video', 'https://example.com/video.mp4', event.sender.id)
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### Supported Attachment Types

- **`file`**: Upload and send a file attachment (e.g., PDFs, documents, etc.).
- **`image`**: Send an image URL as an attachment.
- **`audio`**: Send an audio URL as an attachment.
- **`video`**: Send a video URL as an attachment.

You can extend the list of supported types by adding new types to the `supportedTypes` array in the code.

### Parameters

- **`attachmentType`** (string): The type of the attachment. Can be one of the following:
  - `'file'`: For file uploads.
  - `'image'`: For image URLs.
  - `'audio'`: For audio URLs.
  - `'video'`: For video URLs.

- **`attachment`** (string): The attachment content. This can either be:
  - A **file path** (e.g., `'path/to/file.pdf'`) for file uploads.
  - A **URL** (e.g., `'https://example.com/image.jpg'`) for image, audio, or video URLs.

- **`senderID`** (string): The ID of the recipient. If not provided, it will use the sender ID from the event.

### Response

The function returns a promise that resolves with the response from the Facebook Graph API, which will contain information about the sent message or an error if something goes wrong.

### Example Response:

```json
{
  "recipient_id": "123456789",
  "message_id": "m_123456789",
  "attachment_id": "attach_987654321"
}
```

### Error Handling

If an error occurs, the function will throw an error with details about what went wrong. For example:

```json
{
  "error": {
    "message": "(#100) Param message[attachment][type] is not supported. Please check developer docs for details",
    "type": "OAuthException",
    "code": 100,
    "fbtrace_id": "ACRTjqIJmOIwRF0u868-JSM"
  }
}
```

## Notes

- **File Upload Limitations**: When sending a file, the file must be uploaded to Facebook first. The function handles the upload and retrieval of the attachment ID, which is then used to send the message.

- **Supported Facebook Graph API Versions**: This function is compatible with `v20.0` of the Facebook Graph API. Make sure your API version is aligned with this.

- **Access Tokens**: Make sure that your `PAGE_ACCESS_TOKEN` is set up correctly. This token is required to authenticate requests to the Facebook Graph API.

---

### `api.setMessageReaction`

This API function allows you to send reactions to Facebook messages using the Facebook Graph API. It is intended for use with verified business pages only and will not work on normal Facebook pages.

## Features

- **Send Reactions**: Allows you to send reactions like `LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, and `ANGRY` to messages on a verified business page.
- **Error Handling**: Provides error handling and logs any issues that occur during the process.

## Requirements

- **Verified Business Page**: This API can only be used with a verified business page. It will not work on regular Facebook pages.
- **PAGE_ACCESS_TOKEN**: Ensure that you have a valid page access token with the necessary permissions to interact with the Facebook Graph API.

## Usage

Use the `api.setMessageReaction` function to send a reaction to a message by providing the desired reaction type and message ID.

#### Parameters:
- `reaction` (string): The type of reaction you want to send. Supported values are: `LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, and `ANGRY`.
- `messageId` (string): The ID of the message to which you want to react.

#### Example:

```javascript
const reaction = 'LIKE'; // or 'LOVE', 'HAHA', etc.
const messageId = '1234567890123456'; // The ID of the message to react

api.setMessageReaction(reaction, messageId)
  .then(response => {
    console.log('Reaction sent:', response);
  })
  .catch(error => {
    console.error('Error sending reaction:', error);
  });
```

or, simply like this:

```javascript
api.setMessageReaction('LIKE', '1234567890123456');
```

### 3. Error Handling

If the API call encounters an error, it will log the error message and return `null`.

#### Example of error:

```javascript
Error sending reaction: Unable to send message: { error details }
```

---

## Notes

- This API function only works for verified business pages.

---

### `api.markAsSeen(isSeen, senderID)`

Marks a message as seen or unseen for a user.

#### Parameters:
- `isSeen` (boolean): Set to `true` to mark the message as seen, or `false` to mark it as unseen.
- `senderID` (string): The ID of the user for whom the message is being marked.

#### Usage:
To mark a message as seen:
```javascript
api.markAsSeen(true, event.sender.id);
```

To mark a message as unseen:
```javascript
api.markAsSeen(false, event.sender.id);
```

or, with a promise:
```javascript
api.markAsSeen(false, event.sender.id).then((res) => {
  console.log(res);
}).catch((err) => {
  console.log(err);
});
```

---

## Advanced Messaging with `api.graph`

The `api.graph` method allows for flexible message formatting, enabling you to send image attachments, buttons, and generic templates.

### Sending Button Template

Sends a message with buttons that perform various actions (like opening URLs or triggering postback events).

```javascript
api.graph({
  recipient: { id: event.sender.id },
  message: {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: "What would you like to do?",
        buttons: [
          {
            type: 'web_url',
            url: "https://www.facebook.com/yandeva.me",
            title: "Visit Profile"
          },
          {
            type: 'postback',
            title: "Say Hello",
            payload: "HELLO_PAYLOAD"
          }
        ]
      }
    }
  }
});
```

### Sending Image Attachment

Sends an image attachment to the user.

```javascript
api.graph({
  recipient: { id: event.sender.id },
  message: {
    attachment: {
      type: 'image',
      payload: {
        url: "https://example.com/image.jpg",
        is_reusable: true // Set to true to reuse the image
      }
    }
  }
});
```

### Sending Generic Template

Sends a carousel-style message with multiple items, each with an image, title, subtitle, and buttons.

```javascript
api.graph({
  recipient: { id: event.sender.id },
  message: {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: "First Item",
            image_url: "https://example.com/image1.jpg",
            subtitle: "This is the first item",
            buttons: [
              {
                type: 'web_url',
                url: "https://example.com",
                title: "View Item"
              },
              {
                type: 'postback',
                title: "More Info",
                payload: "MORE_INFO_ITEM_1"
              }
            ]
          },
          {
            title: "Second Item",
            image_url: "https://example.com/image2.jpg",
            subtitle: "This is the second item",
            buttons: [
              {
                type: 'web_url',
                url: "https://example.com",
                title: "View Item"
              },
              {
                type: 'postback',
                title: "More Info",
                payload: "MORE_INFO_ITEM_2"
              }
            ]
          }
        ]
      }
    }
  }
});
```

### Sending Quick Replies

Sends a message with quick reply buttons that disappear after being tapped.

```javascript
api.graph({
  recipient: { id: event.sender.id },
  message: {
    text: "Choose an option:",
    quick_replies: [
      {
        content_type: "text",
        title: "Option 1",
        payload: "OPTION_1"
      },
      {
        content_type: "text",
        title: "Option 2",
        payload: "OPTION_2"
      }
    ]
  }
});
```

Each of these examples demonstrates a different format of messaging to engage users with images, buttons, or dynamic templates. Adjust the templates as needed to fit your application!

## Setting Up "Get Started" Payload

Facebook Messenger allows you to set up a "Get Started" button for new users. When clicked, it sends a payload you can use to initiate a welcome flow.

### Configuring the "Get Started" Button

First, set up the "Get Started" button in your Facebook Page settings or by calling the Facebook API to configure it programmatically.

```javascript
api.graph({
  get_started: { payload: "GET_STARTED_PAYLOAD" }
});
```

### Handling the "Get Started" Payload

When a user clicks the "Get Started" button, a payload is sent. You can use it to send an introductory message or guide the user through initial setup steps.

```javascript
function handlePayload(payload, senderID) {
  if (payload === "GET_STARTED_PAYLOAD") {
    api.sendMessage("Welcome! I'm here to help you.", senderID);
    api.sendMessage("Type 'help' to see what I can do.", senderID);
  }
}

// Example usage
if (event.postback && event.postback.payload) {
  handlePayload(event.postback.payload, event.sender.id);
}
```

---

Here's a sample `README.md` that outlines the differences between **Commands** and **Events** with example code and property explanations.

---

# Commands and Events Differences

In this framework, **Commands** and **Events** serve different purposes, each having unique properties and behaviors that cater to distinct types of interactions. This document explains the differences and provides examples to help understand how to set up each.

## Commands

Commands are user-triggered actions that require specific keywords or prefixes to be recognized. They are typically used for straightforward, user-initiated requests, like `!greet` or `/help`, and need to match the configured command name in order to activate.

### Key Properties for Commands

Commands are structured with specific properties to handle how they respond to user inputs:

- **name**: The name of the command that triggers the execution.
- **usePrefix**: A boolean that defines whether the command requires a prefix (e.g., `!` or `/`) to be recognized.
- **bodyIndex**: Defines the matching behavior for the command name (e.g., starts with, exact match).
- **adminOnly**: Restricts command usage to administrators if set to `true`.

### Command Example

```javascript
module.exports.config = {
  name: "greet",
  author: "YourName",
  version: "1.0",
  description: "Sends a greeting message.",
  adminOnly: false,
  usePrefix: true,
  cooldown: 5
};

module.exports.run = function ({ event, args }) {
  api.sendMessage(`Hello, ${args.join(" ")}!`, event.sender.id);
};
```

### How Commands Work

- **Triggering**: Commands trigger based on matching text (like `!greet`) with the `name` property. The `usePrefix` property determines if the command requires a prefix (e.g., `!greet` vs. just `greet`).

### When to Use Commands
Commands are ideal for specific, user-directed actions where structured responses are required, such as:
- **Bot Features**: `/help` to list commands or `/profile` to show user details.
- **Quick Interactions**: `/greet` to send a greeting message or `/status` to check bot status.
- **Note**: These are just examples.

## Events

Events are general actions that the bot listens for, often without requiring specific prefixes or command names. They are more versatile and are used to handle system-wide interactions, background processes, and message handling that isn’t dependent on user commands.

### Key Properties for Events

Events have configurations that control when they activate:

- **name**: Identifies the event (informational, not used for matching).
- **selfListen**: Determines if the event should handle messages sent by the bot itself.
- **description**: Describes the event’s purpose.

### Event Example

```javascript
module.exports.config = {
  name: "Message Logger",
  author: "YourName",
  version: "1.0",
  description: "Logs every message received.",
  selfListen: false, // Skip handling messages sent by the bot
};

module.exports.run = function ({ event, args }) {
  if (event.type === 'message') {
    console.log(`Received message: ${event.message.text}`);
  }
};
```

### How Events Work

- **Triggering**: Events automatically listen to certain actions or message types, such as new messages, reactions, or postbacks, and don’t require specific text or prefixes to activate.
- **Self-Listening Control**: The `selfListen` property determines if events should handle messages that are bot echoes.
  - If `selfListen` is `false` and the message is an echo (`event.message.is_echo`), the event won’t execute.
- **Flexible Context**: Events are designed to handle broader contexts, often listening for any relevant actions in the system rather than specific keywords.

### When to Use Events

Events are suited for background tasks, global listeners, and anything that doesn’t require specific user input:
- **Message Logging**: Log every incoming message.
- **Background Operations**: Automatically handle user reactions, mark messages as read, or handle postbacks.
- **System Monitoring**: Track interactions that happen passively without user intervention.

## Summary of Differences

| Aspect       | Commands                                      | Events                                    |
|--------------|----------------------------------------------|-------------------------------------------|
| **Trigger**  | User-initiated, needs specific text          | Passively listens for actions or messages |
| **Prefix**   | Requires a prefix if `usePrefix` is `true`   | Does not need a prefix                    |
| **Use Case** | Feature-triggered actions, user commands     | Background tasks, system actions, global listeners |
| **Config Properties** | `name`, `author`, `version`, `category`, `description`, `adminOnly`, `usePrefix`, `cooldown` | `name`, `author`, `version`, `description` `selfListen`, |

By keeping Commands and Events distinct, the framework allows targeted control over user-triggered interactions and system-wide listeners.

--- 

### Event Types

Below are the available event types that are triggered during interactions with the bot:

| Event Type          | Description                                                         |
|---------------------|---------------------------------------------------------------------|
| `message`           | A simple message sent by a sender.                                  |
| `message_reply`     | Triggered when a sender replies to a message.                       |
| `mark_as_seen`      | Logs when a sender marks a message as seen.                         |
| `mark_as_delivered`      | Logs when a sender marks a message as delivered.                         |
| `attachments`       | Triggered when an attachment (image, audio, video, or file) is sent. |
| `postback`          | Triggered when a button is clicked.                                 |
| `quick_reply`       | Triggered when a quick reply button is clicked.                     |
| `message_reaction`  | Triggered when a sender reacts to a message.                        |
| `response_feedback`  | Triggered when a sender clicks a like/dislike button feedback of a message.                        |

This gives the user context on what the event types are and how they are triggered.

---

### Available Terminal Themes

Choose from one of the following terminal themes:

|                | Theme Options |              |
|---------------|---------------|---------------|
| Fiery         | Sunlight      | Ghost         |
| Hacker        | Retro         | Purple        |
| Aqua          | Teen          | Rainbow       |
| Blue          | Summer        | Orange        |
| Pink          | Flower        | Red           |

---

#### Setting Up Your Terminal Theme

You can configure the terminal theme in the `config.json` file, along with the ADMIN and TITLE displayed in the terminal.

```json
{
  "THEME_SETUP": {
    "THEME": "Fiery",
    "ADMIN": "Your Name",
    "TITLE": "PAGEBOT"
  }
}
```

Simply replace `"Fiery"`, `"Your Name"`, and `"PAGEBOT"` with your preferred theme, name, and title to personalize your terminal experience.

--- 

## Message Data
Whenever you reply to a message, you can receive its message content without the need for Page App Review.

### Replying to an attachments:
```json
{
  "sender": { "id": "8044984915628464" },
  "recipient": { "id": "392705877267020" },
  "timestamp": 1735858742487,
  "message": {
    "mid": "m_23456",
    "text": "Reply test?",
    "reply_to": {
      "mid": "m_2025123",
      "text": null,
      "attachments": [
        { 
          "type": "template",
          "title": "Hey there newbie!",
          "payload": { 
            "template_type": "generic",
            "sharable": false,
            "elements": [Array] 
          }
        }
      ]
    }
  },
  "type": "message_reply"
}
```

### Replying to a text:
```json
{
  "sender": { "id": "8044984915628464" },
  "recipient": { "id": "392705877267020" },
  "timestamp": 1735858742817,
  "message": {
    "mid": "m_23456",
    "text": "Reply test?",
    "reply_to": {
      "mid": "m_1244567",
      "text": "Hey there! How may I help you today?",
      "attachments": null
    }
  },
  "type": "message_reply"
}
```

The message datas are stored in `./page/data.json`. You can set it up whether you want to use less storage data through clearing it in the `config.json` by setting `clearData` into true. It will clear everytime you run the code.

---

## Author

If you encounter issues or need support, feel free to reach out to the author:

- **Yan Maglinte** (FB: [@YanMaglinte](https://www.facebook.com/yandeva.me))

================================================
FILE: LICENSE.md
================================================
**MIT License**

Copyright (c) 2024 Yan Maglinte

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**

================================================
FILE: README.md
================================================
# Pagebot (PBOT)

Pagebot (PBOT) is a user-friendly Facebook Page Bot builder designed to make bot creation and management easy—perfect for both beginners and experienced developers. With intuitive tools, you can have your bot up and running in minutes!

<div align="center">
  <a href="https://m.me/pekoai" target="_blank">
    <img src="https://i.ibb.co/5T8bq2P/pagebot.png" alt="Pagebot Cover" width="500"/>
  </a>
</div>

## Features

- **Easy Setup**: Create and deploy your bot effortlessly—ideal for those just starting out with bot development.
- **Customizable**: Modify the bot’s features and responses to fit your unique needs.
- **Beginner-Friendly**: No advanced programming knowledge required; PBOT is accessible to everyone.
- **Handle Replies**: Handles replies without the need for Page App Review.

## Why Choose Pagebot?

PBOT was designed with accessibility in mind, making bot-building straightforward for users of all skill levels. Whether you're new to programming or simply looking for an efficient tool to manage your Facebook Page Bot, PBOT has you covered. Developed by [Yan Maglinte](https://www.facebook.com/yandeva.me) 🇵🇭, a passionate solo developer dedicated to empowering others.

## Getting Started

1. **Get Your Token**: Log in to Facebook and visit [Facebook Developer](https://developers.facebook.com/) to get your Facebook Page Access Token. Make sure you have already set up a Facebook Business Page.
2. **Create Your Bot**: Use simple commands to configure and launch your bot in just a few minutes.
3. **Customize Your Bot**: Adjust settings and responses to match your brand or personal style.

## Contributing

PBOT is open to contributions! If you'd like to suggest features, report bugs, or contribute to the code, feel free to open issues or submit pull requests to help improve PBOT for the community.

---

<div align="center">
  <h3>Try my Bot!</h3>
  <p>Try Peko, a Facebook Pagebot assistant.<br>Just click the image below to start chatting!</p>
  <a href="https://m.me/pekoai" target="_blank">
    <img src="https://i.ibb.co/qkTCVv9/circle.png" alt="Peko Bot" width="80"/>
  </a>
</div>

---

### License

Pagebot is released under the [MIT License](LICENSE), making it free to use, modify, and distribute under the terms of this open-source license.

*Created on November 8, 2024*  

================================================
FILE: index.js
================================================
const web = require("./website/web.js");
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const app = express();

app.use(parser.json());
app.use(express.static("website"));
app.get("/config.json", (req, res) => {
  res.sendFile(path.join(__dirname, "config.json"));
});

app.get("/", (req, res) => {
  web.html(res);
});

app.get("/webhook", (req, res) => {
  web.verify(req, res);
});

setTimeout(() => {
  app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
  });
}, 5000);

app.listen(8080, () => {
  web.log();
});


================================================
FILE: webhook.js
================================================
const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");

let messagesCache;

if (config.clearData) {
  messagesCache = {};
} else {
  messagesCache = JSON.parse(fs.readFileSync("./page/data.json"), "utf8");
};

const messagesFilePath = "./page/data.json";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function writeToFile() {
  try {
    const dataToWrite = JSON.stringify(messagesCache, null, 2);

    const fileStats = fs.existsSync(messagesFilePath)
      ? fs.statSync(messagesFilePath)
      : null;
    if (fileStats && fileStats.size > MAX_FILE_SIZE) {
      pruneMessagesCache();
    }

    fs.writeFileSync(messagesFilePath, dataToWrite, "utf8");
  } catch (error) {
    console.error("Error writing to file:", error);
  }
}

function pruneMessagesCache() {
  const keys = Object.keys(messagesCache);
  if (keys.length > 1000) {
    const oldestKey = keys[0];
    delete messagesCache[oldestKey];
    pruneMessagesCache();
  }
}

module.exports.listen = function (event) {
  try {
    if (event.object === "page") {
      event.entry.forEach((entry) => {
        entry.messaging.forEach(async (event) => {
          event.type = await utils.getEventType(event);

          global.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;

          if (
            event.type === "message" ||
            event.type === "message_reply" ||
            event.type === "attachments" ||
            event.type === "message_reaction"
          ) {
            const mid = event.message?.mid || event.reaction?.mid;

            if (event.type === "message" || event.type === "attachments" || "message_reply") {
              const text = event.message.text;
              const attachments = event.message.attachments;

              if (mid && text) {
                messagesCache[mid] = { text };
              }

              if (mid && attachments) {
                if (!messagesCache[mid]) messagesCache[mid] = {};
                messagesCache[mid].attachments = attachments;
              }
            }

            if (event.type === "message_reply") {
              const messageID = event.message.reply_to?.mid;
              const cachedMessage = messageID ? messagesCache[messageID] : null;

              if (event.message.reply_to) {
                event.message.reply_to.text = cachedMessage?.text || null;
                event.message.reply_to.attachments =
                  cachedMessage?.attachments || null;
              }
            }

            if (event.type === "message_reaction") {
              const cachedMessage = mid ? messagesCache[mid] : null;

              if (cachedMessage) {
                event.reaction.text = cachedMessage.text || null;
                event.reaction.attachments = cachedMessage.attachments || null;
              } else {
                event.reaction.text = null;
                event.reaction.attachments = null;
              }
            }
          }
          
          if (config.selfListen && event?.message?.is_echo) return;
          writeToFile();
          utils.log(event);

          require("./page/main")(event);
        });
      });
    }
  } catch (error) {
    console.error(error);
  }
};

================================================
FILE: modules/scripts/commands/buttons.js
================================================
module.exports.config = {
  name: "button", // Command name (required)
  author: "Yan Maglinte", // Author of this script
  version: "1.0", // Script version; update if you modify the script
  category: "Utility", // Category for organization in help commands
  description: "Sends a button message.", // Description of the command
  adminOnly: false, // Restrict command usage to admins only if set to true
  usePrefix: true, // Activates command only if prefixed, when set to true
  cooldown: 5,
};

// Main code execution starts here
// 'event' and 'args' are parameters passed by the command handler
module.exports.run = function ({ event }) {
  // Sends a button message to the user
  api
    .sendButton(
      "Here are your options:",
      [
        {
          type: "web_url",
          url: "https://www.facebook.com/yandeva.me",
          title: "Check Profile",
        },
        {
          type: "postback",
          title: "Say Hello",
          payload: "HELLO_PAYLOAD",
        },
      ],
      event.sender.id,
    )
    .then((res) => {
      //console.log("Response:", res);
    })
    .catch((err) => {
      //console.error("Error:", err);
    });
};


================================================
FILE: modules/scripts/commands/get.js
================================================
module.exports.config = {
  name: "get", // Command Name (IMPORTANT)
  author: "Yan Maglinte", // The author of this script
  version: "1.0", // If you want to update your own version, please update this.
  category: "Utility", // Change this to the desired category, helpful for help.js command
  description: "Sends the user's recipient ID", // Command's description
  adminOnly: true, // Only admins can use this command
  usePrefix: true, // Will use a PREFIX if its true to activate this command
  cooldown: 0, // cooldown time in seconds
};

// The code scripts runs here
// event and args are the parameters you get from the command handler
module.exports.run = function ({ event, args }) {
  // If event type is just a message
  if (event.type === "message") {
    api.sendMessage("This is your ID: " + event.sender.id, event.sender.id);
  };

  // The received ID, can be used in the config.json to add your ID as part of the admin list and will be sent if it's replying to a message
  if (event.type === "message_reply") {
    api.sendMessage(`This your ID: ${event.sender.id}`, event.sender.id);
    console.log(event)
  }
  // This will send a message to the sender if it replies to a message
};


================================================
FILE: modules/scripts/commands/gpt.js
================================================
const { gpt } = require("gpti");

module.exports.config = {
  name: "gpt",
  author: "Yan Maglinte",
  version: "1.0",
  category: "AI",
  description: "Chat with gpt",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  if (event.type === "message") {
    let prompt = args.join(" ");

    let data = await gpt.v1({
        messages: [],
        prompt: prompt,
        model: "GPT-4",
        markdown: false
    });

    api.sendMessage(data.gpt, event.sender.id).catch(err => {
        console.log(err);
    });
  } else if (event.type === "message_reply") {
    let prompt = `Message: "${args.join(" ")}\n\nReplying to: ${event.message.reply_to.text}`;

    let data = await gpt.v1({
        messages: [],
        prompt: prompt,
        model: "GPT-4",
        markdown: false
    });

    api.sendMessage(data.gpt, event.sender.id).catch(err => {
        console.log(err);
    });
  }
};


================================================
FILE: modules/scripts/commands/greet.js
================================================
module.exports.config = {
  name: "greet", // Command Name (IMPORTANT)
  author: "Yan Maglinte", // The author of this script
  version: "1.0", // If you want to update your own version, please update this.
  category: "Utility", // Change this to the desired category, helpful for help.js command
  description: "Sends a back greeting message.", // Command's description
  adminOnly: false, // Only admins can use this command
  usePrefix: false, // Will use a PREFIX if its true to activate this command
  cooldown: 10, // Cooldown time in seconds
};

// The code scripts runs here
// event and args are the parameters you get from the command handler
module.exports.run = function ({ event, args }) {
  //console.log(`Hello, ${args.join(" ")}!`);
  api.sendMessage("Hello! " + args.join(" "), event.sender.id);

  // This will send a message to the sender if it replies to a message
  if (event.type === "message_reaction") {
    api.sendMessage("Replying to your message: " + args.join(" "), event.sender.id);
  }
};


================================================
FILE: modules/scripts/commands/help.js
================================================
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Yan Maglinte",
  version: "1.0",
  category: "Utility",
  description: "Sends a back greeting message and lists all commands and events.",
  adminOnly: false,
  usePrefix: true,
  cooldown: 5, // Cooldown time in seconds
};

module.exports.run = function ({ event, args }) {
  if (event.type === "message" || event.postback.payload === "HELP_PAYLOAD") {
    const commandsPath = path.join(__dirname, "../commands");
    const eventsPath = path.join(__dirname, "../events");

    let message = "Here are the available commands and events:\n\n";

    // Load and log command details
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    message += "Commands:\n";
    commandFiles.forEach((file) => {
      const command = require(path.join(commandsPath, file));
      if (command.config) {
        message += `${command.config.usePrefix ? PREFIX : ""}${command.config.name}\n`;
        message += `Author: ${command.config.author}\n`;
        message += `Description: ${command.config.description}\n\n`;
        // message += `Admin Only: ${command.config.adminOnly ? "Yes" : "No"}\n`;
        // message += `Prefix Required: ${command.config.usePrefix ? "Yes" : "No"}\n\n`;
      }
    });

    // Load and log event details
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));
    message += "Events:\n";
    eventFiles.forEach((file) => {
      const event = require(path.join(eventsPath, file));
      if (event.config) {
        message += `- ${event.config.name}\n`;
        message += `Author: ${event.config.author}\n`;
        message += `Description: ${event.config.description}\n\n`;
        // message += `Admin Only: ${event.config.adminOnly ? "Yes" : "No"}\n\n`;
      }
    });

    message += "Feel free to use these commands and events as you wish.";
    // Send the message to the user
    api.sendMessage(message, event.sender.id);
  }
};


================================================
FILE: modules/scripts/commands/image.js
================================================
module.exports.config = {
  name: "image",
  author: "Yan Maglinte",
  version: "1.0",
  category: "Utility",
  description: "Sends an attachment.",
  adminOnly: false, 
  usePrefix: true,
  cooldown: 5, // Cooldown time in seconds
};

module.exports.run = function ({ event, args }) {
  // Method 1
  api.graph({
    recipient: {
      id: event.sender.id
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: 'https://i.ibb.co/G9RBVz1/Facebook-Page-Bot-Icon.jpg',
          is_reusable: false
        }
      }
    }
  }).then((res) => {
    //console.log(res);
  }).catch((err) => {
    //console.error(err);
  });

  // Method 2
  api.sendAttachment("image", "https://i.ibb.co/G9RBVz1/Facebook-Page-Bot-Icon.jpg", event.sender.id);
}


================================================
FILE: modules/scripts/events/sample.js
================================================
module.exports.config = {
  name: 'The Book of Knowledge', // JEJEMON HAHAHAHAHA
  author: 'Yan Maglinte',
  version: '1.0',
  description: 'Public events can be place here. It will keep on listening events.',
  selfListen: false,
};

module.exports.run = async function({ event, args }) {
  // YOU CAN ADD ANYTHING HERE, ADD MORE OR DO WHAT YOU WANT HERE, I DON'T CARE ^-^
  
  /** EVENT TYPES
   * postback
   * quick_reply
   * message_reaction
   * message_reply
   * message
   * mark_as_seen
   * @YanMaglinte **/
};

================================================
FILE: modules/scripts/events/script.js
================================================
module.exports.config = {
  name: 'The Script of Everything',
  author: 'Yan Maglinte',
  version: '1.0',
  description: 'Allows you to input code here without the need for prefixes or names; it will execute automatically.',
  selfListen: false,
};

let enter = false;
module.exports.run = async function({ event, args }) {
  if (event.type === 'message' && !enter) {
    api.graph({
      recipient: {
        id: event.sender.id
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: 'Hey there newbie!', // The title of the generic message
                subtitle: 'Thank you for using Pagebot. Leave a like on my repository and support my work.', // The subtitle of the message
                image_url: 'https://i.ibb.co/dJzSv5Q/pagebot.jpg', // The image URL
                buttons: [
                  {
                    type: 'web_url',
                    url: 'https://www.facebook.com/yandeva.me',
                    title: 'Check my Profile'
                  },
                  {
                    type: 'postback',
                    title: `${PREFIX}help`,
                    payload: 'HELP_PAYLOAD'
                  }
                ]
              }
            ]
          }
        }
      }
    });
    enter = true;
  };

  /** EVENT TYPES
   * postback
   * quick_reply
   * message_reaction
   * message_reply
   * message
   * mark_as_seen
   * @YanMaglinte **/
};

================================================
FILE: modules/utils.js
================================================
const fs = require("fs-extra");

function getEventType(event) {
  return new Promise((resolve) => {
    let type = "unknown";

    if (event) {
      const msg = event.message;
      if (msg) {
        if (msg.attachments) {
          type = "attachments";
        } else if (msg.reply_to) {
          type = "message_reply";
        } else if (msg.quick_reply) {
          type = "quick_reply";
        } else {
          type = "message";
        }
      } else if (event.response_feedback) {
        type = "response_feedback";
      } else if (event.postback) {
        type = "postback";
      } else if (event.reaction) {
        type = "message_reaction";
      } else if (event.read) {
        type = "mark_as_read";
      } else if (event.delivery) {
        type = "mark_as_delivered";
      }
    }

    resolve(type);
  });
}

async function log(event) {
  const config = JSON.parse(fs.readFileSync("./config.json"), "utf8");
  let senderId = event.sender.id || null;

  if (config.ADMINS.includes(senderId)) {
    piece = "ADMIN";
  } else {
    piece = "USER";
  };

  const theme = require('../website/web.js').getTheme();

  if (event?.message?.text && !event?.message?.is_echo) {
    console.log(`${theme.gradient.multiline(piece)}: ${event.message.text} ${theme.color((await getEventType(event)).toUpperCase())}`)
  } else if (event.type === "message_reaction") {
    if (event.reaction.emoji) {
       console.log(`${theme.gradient.multiline(piece)}: ${senderId} reacted "${event.reaction.emoji}" to a message. ${theme.color((await getEventType(event)).toUpperCase())}`)
    } else {
       console.log(`${theme.gradient.multiline(piece)}: ${senderId} removed a reaction to a message. ${theme.color((await getEventType(event)).toUpperCase())}`)
    }
  } else if (event?.message?.is_echo && !config.selfListen) {
    console.log(`${theme.gradient.multiline("BOT")}: ${event?.message?.text || event?.message?.attachments?.[0].title || event?.message?.attachments[0]?.payload.url || null } ${theme.color((await getEventType(event)).toUpperCase())}`);
  } else if (event.type === "attachments") {
    console.log(`${theme.gradient.multiline(piece)}: ${event?.message?.attachments[0]?.payload.url || null} ${theme.color((await getEventType(event)).toUpperCase())}`)
  } else if (event.type === "postback") {
    console.log(`${theme.gradient.multiline(piece)}: ${event?.postback?.title} ${theme.color((await getEventType(event)).toUpperCase())}`);
  }
}

module.exports = {
  log,
  getEventType,
};

================================================
FILE: page/handler.js
================================================
const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const { getTheme } = require("../website/web.js");
const cooldowns = {}; // Track cooldowns for each user and command

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const eventsPath = path.join(__dirname, "../modules/scripts/events");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));

  // Check if the sender is an admin
  const isAdmin = config.ADMINS.includes(event.sender.id);

  if (event?.message?.is_echo) {
    event.sender.id = event.recipient.id;
  };

  // Mark messages as seen if turned on
  if (config.markAsSeen) {
    api.markAsSeen(true, event.threadID).then().catch(err => console.error(err));
  };

  // Extract command text and arguments from the event
  const messageText = event.message?.text || event.postback?.title || "";
  const [rawCommandName, ...args] = messageText.split(" ");

  for (const file of commandFiles) {
    const commandPath = path.join(modulesPath, file);
    const command = require(commandPath);

    if (command && command.config && typeof command.config.name === "string") {
      let commandName;

      // Check if the command requires a prefix
      if (command.config.usePrefix) {
        if (rawCommandName.startsWith(config.PREFIX)) {
          commandName = rawCommandName.slice(config.PREFIX.length).toLowerCase();
        } else {
          continue; // Skip if the command requires prefix but it's not used
        }
      } else {
        commandName = rawCommandName.toLowerCase();

        // Notify the user that the command doesn't need a prefix if they used one
        if (rawCommandName.startsWith(config.PREFIX + command.config.name) && !command.config.usePrefix) {
          api.sendMessage(`The "${command.config.name}" command does not require a prefix. Please try again without it.`, event.sender.id);
          continue;  // Skip execution of this command if prefix is used unnecessarily
        }
      }

      // Check if the command is admin-only and if the sender is an admin
      if (commandName === command.config.name.toLowerCase() && command.config.adminOnly && !isAdmin) {
        api.sendMessage("You do not have permission to use this command.", event.sender.id);
        continue;
      }

      if (command.config.name.toLowerCase() === commandName) {
        const cooldownTime = command.config.cooldown || 0; // Default to 0 seconds if cooldown is not set
        const userCooldown = cooldowns[event.sender.id] || {};
        const lastUsed = userCooldown[command.config.name] || 0;
        const now = Date.now();

        // Check cooldown only if it's greater than 0
        if (cooldownTime > 0 && now - lastUsed < cooldownTime * 1000) {
          const remainingTime = Math.ceil((cooldownTime * 1000 - (now - lastUsed)) / 1000);
          api.sendMessage(`Please wait ${remainingTime} second(s) before using this command again.`, event.sender.id);
          return;
        }

        // Update cooldown
        cooldowns[event.sender.id] = {
          ...userCooldown,
          [command.config.name]: now
        };

        console.log(getTheme().gradient(`SYSTEM:`), `${command.config.name} command was executed!`);
        try {
          await command.run({ event, args });
        } catch (error) {
          console.error(`Error executing ${command.config.name}:`, error);
        }
      }
    } else {
      console.log(`Skipped command: ${file} - missing or invalid config.`);
    }
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
  for (const file of eventFiles) {
    const eventModulePath = path.join(eventsPath, file);
    const ev = require(eventModulePath);

    if (!ev.config?.selfListen && event.message?.is_echo) return;

    try {
      await ev.run({ event, args });
    } catch (error) {
      console.error(`Error executing event handler ${file}:`, error);
    }
  }
};


================================================
FILE: page/main.js
================================================
module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  const scripts = [
    "graph",
    "markAsSeen",
    "sendAttachment",
    "sendButton",
    "sendMessage",
    "sendTypingIndicator",
    "setMessageReaction",
  ];

  const promises = scripts.map((v) => {
    return new Promise((resolve, reject) => {
      const script = require("./src/" + v)(event);
      if (script) {
        api[v] = script;
        resolve();
      } else {
        reject(new Error(`Failed to load script: ${v}`));
      }
    });
  });

  return Promise.all(promises)
    .then(() => {
      global.api = api;
      global.PREFIX = config.PREFIX;
      global.BOTNAME = config.BOTNAME;
      
      require("./handler.js")(event);
    })
    .catch((err) => {
      console.error("Error loading scripts:", err);
      throw err;
    });
};

================================================
FILE: page/src/graph.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function graph(form) {
    // Directly return the axios promise
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data) // Return the response data
      .catch((err) => {
        // Handle errors and throw them
        throw err.response ? err.response.data : err.message;
      });
  };
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me

================================================
FILE: page/src/markAsSeen.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function markAsSeen(boolean, senderId) {
    // Prepare the form based on the boolean value
    const form = {
      recipient: {
        id: senderId || event.sender.id,
      },
      sender_action: boolean ? "mark_seen" : "mark_unread",
    };

    // Return the axios promise directly
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data) // Return the response data
      .catch((err) => {
        // Handle errors and throw them
        throw err.response ? err.response.data : err.message;
      });
  };
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me


================================================
FILE: page/src/sendAttachment.js
================================================
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports = function (event) {
  return function sendAttachment(attachmentType, attachment, senderID) {
    const recipientID = senderID || event.sender.id;
    let attachmentId = null;

    // Determine the type of attachment (audio, file, image, etc.)
    const supportedTypes = ['audio', 'file', 'image', 'video']; // Add other types as needed

    if (supportedTypes.includes(attachmentType)) {
      if (attachmentType === 'file') {
        // If it's a file, upload it to Facebook
        const fileData = new FormData();
        fileData.append('file', fs.createReadStream(attachment)); // 'attachment' is the local file path

        // Upload the file and return the promise directly
        return axios
          .post(
            `https://graph.facebook.com/v20.0/me/message_attachments?access_token=${PAGE_ACCESS_TOKEN}`,
            fileData,
            {
              headers: fileData.getHeaders(), // Include headers for the form data
            }
          )
          .then((uploadResponse) => {
            attachmentId = uploadResponse.data.attachment_id; // Get the attachment ID from the response

            // Send the file attachment with the attachment ID
            const attachmentPayload = {
              type: 'file', // Type for files
              payload: { attachment_id: attachmentId }, // For file, use the attachment ID
            };

            return sendMessage(attachmentPayload, recipientID);
          })
          .catch((err) => {
            throw err.response ? err.response.data : err.message;
          });
      } else if (attachmentType === 'url') {
        // If it's a URL, use it directly
        attachmentId = attachment; // Use the URL directly in the payload

        // Send the attachment
        const attachmentPayload = {
          type: attachmentType, // dynamic type like 'image', 'audio', 'video', etc.
          payload: { url: attachmentId, is_reusable: true }, // For URL, use the URL directly
        };

        return sendMessage(attachmentPayload, recipientID);
      } else {
        return Promise.reject({ error: "Invalid attachment type." });
      }
    } else {
      return Promise.reject({ error: "Unsupported attachment type." });
    }
  };

  // Helper function to send the message with the attachment
  function sendMessage(attachmentPayload, recipientID) {
    const form = {
      recipient: { id: recipientID },
      message: {
        attachment: attachmentPayload, // Directly use the attachment payload passed
      },
      messaging_type: "RESPONSE",
    };

    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};


================================================
FILE: page/src/sendButton.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const recipientID = senderID || event.sender.id;

    // Map the buttons to the format expected by the Facebook API
    const payload = buttons.map(button => ({
      type: button.type || 'postback', // 'postback' or 'web_url'
      title: button.title,
      payload: button.payload || null,
      url: button.url || null, // Only for 'web_url' type buttons
    }));

    // Structure the message as a button template
    const form = {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: text,
            buttons: payload,
          },
        },
      },
      messaging_type: "RESPONSE",
    };

    // Return a promise from Graph
    return Graph(form);
  };

  function Graph(form) {
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me


================================================
FILE: page/src/sendMessage.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function sendMessage(text, senderID) {
    const recipientID = senderID || event.senderID;

    // Function to split the message into chunks
    function splitMessage(text) {
      const maxLength = 2000;
      const messages = [];
      let remainingText = text;

      while (remainingText.length > maxLength) {
        // Find the last newline character within the maxLength limit
        let splitIndex = remainingText.lastIndexOf("\n", maxLength);

        if (splitIndex === -1) {
          splitIndex = maxLength;
        } else {
          splitIndex += 1; // Include the newline character in the split
        }

        messages.push(remainingText.slice(0, splitIndex).trim());
        remainingText = remainingText.slice(splitIndex).trim();
      }

      messages.push(remainingText);
      return messages;
    }

    const messages = splitMessage(text);

    // Process each message chunk
    const sendPromises = messages.map(message => {
      const form = {
        recipient: { id: recipientID },
        message: { text: message },
        messaging_type: "RESPONSE",
      };

      return Graph(form);
    });

    // Return a single promise that resolves when all messages are sent
    return Promise.all(sendPromises)
      .then(results => results)
      .catch(err => {
        throw err;
      });
  };

  function Graph(form) {
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me


================================================
FILE: page/src/sendTypingIndicator.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function sendTypingIndicator(isTyping, userId) {
    const senderAction = isTyping ? "typing_on" : "typing_off";
    const form = {
      recipient: {
        id: userId || event.sender.id,
      },
      sender_action: senderAction,
    };

    // Return the promise directly
    return Graph(form)
      .then((response) => response)
      .catch((err) => {
        throw err;
      });
  };

  function Graph(form) {
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me


================================================
FILE: page/src/setMessageReaction.js
================================================
const axios = require("axios");

module.exports = function (event) {
  return function setMessageReaction(reaction, messageId) {
    return Graph(reaction, messageId)
      .then((response) => response)
      .catch((error) => {
        console.error("Error sending reaction:", error);
        throw error; // Propagate the error
      });
  };

  function Graph(reaction, messageId) {
    const payload = {
      access_token: PAGE_ACCESS_TOKEN,
      reaction: reaction,
    };

    return axios
      .post(
        `https://graph.facebook.com/v20.0/${messageId}/reactions`,
        payload
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};

// If an error occurs please contact @YanMaglinte
// FB: https://www.facebook.com/yandeva.me


================================================
FILE: website/index.html
================================================
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://use.fontawesome.com/d1341f9b7a.js"></script>
    <title>Pagebot</title>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
      body {
        background-color: #190096;
      }
      .bg {
        width: 100%;
        height: 100vh;
        background-image: linear-gradient(
          45deg,
          #bc6107 0%,
          #fe8916 46%,
          #ff952a 100%
        );
      }
      .glass {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .glass li {
        position: absolute;
        display: block;
        list-style: none;
        width: 20px;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        animation: spin 5s linear infinite;
        bottom: -150px;
      }
      .glass li:nth-child(1) {
        left: 35%;
        width: 150px;
        height: 150px;
        animation-delay: 0s;
      }
      .glass li:nth-child(2) {
        left: 10%;
        width: 20px;
        height: 20px;
        animation-delay: 2s;
        animation-duration: 12s;
      }
      .glass li:nth-child(3) {
        left: 70%;
        width: 20px;
        height: 20px;
        animation-delay: 4s;
      }
      .glass li:nth-child(4) {
        left: 40%;
        width: 60px;
        height: 60px;
        animation-delay: 0s;
        animation-duration: 18s;
      }
      .glass li:nth-child(5) {
        left: 65%;
        width: 20px;
        height: 20px;
        animation-delay: 0s;
      }
      .glass li:nth-child(6) {
        left: 75%;
        width: 110px;
        height: 110px;
        animation-delay: 3s;
      }
      .glass li:nth-child(7) {
        left: 35%;
        width: 150px;
        height: 150px;
        animation-delay: 7s;
      }
      .glass li:nth-child(8) {
        left: 50%;
        width: 25px;
        height: 25px;
        animation-delay: 15s;
        animation-duration: 45s;
      }
      .glass li:nth-child(9) {
        left: 20%;
        width: 15px;
        height: 15px;
        animation-delay: 2s;
        animation-duration: 35s;
      }
      .glass li:nth-child(10) {
        left: 85%;
        width: 150px;
        height: 150px;
        animation-delay: 0s;
        animation-duration: 11s;
      }
      .glass li:nth-child(11) {
        left: 10%;
        width: 110px;
        height: 110px;
        animation-delay: 0s;
        animation-duration: 11s;
      }
      glass li:nth-child(12) {
        left: 45%;
        width: 160px;
        height: 160px;
        animation-delay: 2s;
        animation-duration: 5s;
      }

      @keyframes spin {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
          border-radius: 80%;
        }
        100% {
          transform: translateY(-1000px) rotate(720deg);
          opacity: 0;
          border-radius: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="bg">
      <ul class="glass">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>
    <script type="module" src="script.js"></script>
  </body>
</html>


================================================
FILE: website/script.js
================================================
document.addEventListener('DOMContentLoaded', function () {
  // Get the element by its class name
  const bgElement = document.querySelector('.bg');  // Use querySelector instead of getElementById

  // Fetch the config data
  fetch('../config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(configData => {
      // Access the HTML colors from the config file
      const htmlColors = configData.THEME_SETUP.HTML;

      // Define the new background gradient using the colors from the theme
      const newGradient = `linear-gradient(45deg, ${htmlColors[0]} 0%, ${htmlColors[1]} 46%, ${htmlColors[2]} 100%)`;

      // Apply the new background gradient to the .bg element
      bgElement.style.backgroundImage = newGradient;
    })
    .catch(error => {
      console.error('Error loading config.json:', error);
    });
});


================================================
FILE: website/web.js
================================================
const path = require("path");
const fs = require("fs");
const color = require("gradient-string");
const chalk = require("chalk");
const config = require("../config.json");
const font = require("fontstyles");
const axios = require("axios");

function html(res) {
  res.sendFile(path.join(__dirname, "index.html"));
}

// Function to display a loading bar
function loadingBar(duration, color) {
  const totalLength = 24; // Length of the loading bar
  let currentLength = 0;

  const interval = setInterval(() => {
    currentLength++;
    const filledLength = "━".repeat(currentLength);
    const unfilledLength = " ".repeat(totalLength - currentLength);
    const percentage = ((currentLength / totalLength) * 100).toFixed(2);

    // Clear the line and print the loading bar
    process.stdout.write(
      `\r |${color(filledLength)}${unfilledLength}| ${percentage}%`,
    );

    if (currentLength >= totalLength) {
      clearInterval(interval);
      console.log("\n\n" + chalk.bold.dim("CHAT LOG:")); // Move to the next line after loading
    }
  }, duration / totalLength); // Adjust the duration to your needs
}

// Retrieve admin name, using a fallback default if not found
const adminName = config.THEME_SETUP.ADMIN || "Unknown";

// ASCII mappings for letter characters, with uppercase and lowercase options
const asciiMappings = {
  a: { upper: " ▄▀█", lower: "░█▀█" },
  b: { upper: "░█▄▄", lower: "░█▄█" },
  c: { upper: "░█▀▀", lower: "░█▄▄" },
  d: { upper: "░█▀▄", lower: "░█▄▀" },
  e: { upper: "░█▀▀", lower: "░██▄" },
  f: { upper: "░█▀▀", lower: "░█▀ " },
  g: { upper: "░█▀▀", lower: "░█▄█" },
  h: { upper: "░█░█", lower: "░█▀█" },
  i: { upper: "░█", lower: "░█" },
  j: { upper: "░░░█", lower: "░█▄█" },
  k: { upper: "░█▄▀", lower: "░█░█" },
  l: { upper: "░█░░", lower: "░█▄▄" },
  m: { upper: "░█▀▄▀█", lower: "░█░▀░█" },
  n: { upper: "░█▄░█", lower: "░█░▀█" },
  o: { upper: "░█▀█", lower: "░█▄█" },
  p: { upper: "░█▀█", lower: "░█▀▀" },
  q: { upper: "░█▀█", lower: " ▀▀█" },
  r: { upper: "░█▀█", lower: "░█▀▄" },
  s: { upper: "░█▀", lower: "░▄█" },
  t: { upper: " ▀█▀", lower: "░░█░" },
  u: { upper: "░█░█", lower: "░█▄█" },
  v: { upper: "░█░█", lower: "░▀▄▀" },
  w: { upper: "░█░█░█", lower: "░▀▄▀▄▀" },
  x: { upper: " ▀▄▀", lower: "░█░█" },
  y: { upper: "░█▄█", lower: "░░█░" },
  z: { upper: "░▀█", lower: "░█▄" },
  "-": { upper: " ▄▄", lower: "░░░" },
  "+": { upper: " ▄█▄", lower: "░░▀░" },
  ".": { upper: "░", lower: "▄" },
};

// Generates ASCII art based on provided text
function generateAsciiArt(text) {
  const title = text || "PAGEBOT";
  const lines = ["  ", "  "];
  for (const char of title.toLowerCase()) {
    const mapping = asciiMappings[char] || { upper: "  ", lower: "  " };
    lines[0] += mapping.upper;
    lines[1] += mapping.lower;
  }

  setTimeout(() => {
    font.bin(getTheme().gradient, getTheme().color)
  }, 400);
  return lines.join("\n");
}

// Get the theme and determine color settings for the gradient and chalk
const theme = config.THEME_SETUP.THEME.toLowerCase() || "";
let colorGradient, colorChalk, htmlColors;

switch (theme) {
  case "fiery":
    colorGradient = color.fruit;
    colorChalk = color("#EB0000", "#D80606", "#E5A800");
    htmlColors = ["#CE2F16", "#fe8916", "#ff952a"];
    logTheme("Fiery");
    break;
  case "aqua":
    colorGradient = color("#2e5fff", "#466deb");
    colorChalk = chalk.hex("#88c2f7");
    htmlColors = ["#2e5fff", "#466deb", "#1BD4F5"];
    logTheme("Aqua");
    break;
  case "hacker":
    colorGradient = color("#47a127", "#0eed19", "#27f231");
    colorChalk = chalk.hex("#4be813");
      htmlColors = ["#049504", "#0eed19", "#01D101"];
    logTheme("Hacker");
    break;
  case "blue":
    colorGradient = color("#1702CF", "#11019F ", "#1401BF");
    colorChalk = chalk.blueBright;
    htmlColors= ["#1702CF", "#11019F ", "#1401BF"];
    logTheme("Blue");
    break;
  case "pink":
    colorGradient = color("#ab68ed", "#ea3ef0", "#c93ef0");
    colorChalk = chalk.hex("#8c00ff");
    htmlColors = ["#ab68ed", "#ea3ef0", "#c93ef0"];
    logTheme("Pink");
    break;
  case "sunlight":
    colorGradient = color("#ffae00", "#ffbf00", "#ffdd00");
    colorChalk = chalk.hex("#f6ff00");
    htmlColors = ["#ffae00", "#ffbf00", "#ffdd00"];
    logTheme("Sunlight");
    break;
  case "retro":
    colorGradient = color.retro;
    colorChalk = chalk.hex("#7d02bf");
    htmlColors = ["#7d02bf", "#FF6F6F", "#E67701"];
    logTheme("Retro");
    break;
  case "teen":
    colorGradient = color.teen;
    colorChalk = chalk.hex("#fa7f7f");
    htmlColors = ["#29D5FB", "#9CFBEF", "#fa7f7f"]
    logTheme("Teen");
    break;
  case "summer":
    colorGradient = color.summer;
    colorChalk = chalk.hex("#f7f565");
    htmlColors = ["#f7f565", "#16FAE3", "#16D1FA"]
    logTheme("Summer");
    break;
  case "flower":
    colorGradient = color.pastel;
    colorChalk = chalk.hex("#6ded85");
    htmlColors = ["#16B6FA", "#FB7248", "#13FF9C"]
    logTheme("Flower");
    break;
  case "ghost":
    colorGradient = color.mind;
    colorChalk = chalk.hex("#95d0de");
    htmlColors = ["#076889", "#0798C7", "#95d0de"]
    logTheme("Ghost");
    break;
  case "purple":
    colorGradient = color("#380478", "#5800d4", "#4687f0");
    colorChalk = chalk.hex('#7a039e');
    htmlColors = ["#380478", "#5800d4", "#4687f0"]
    logTheme("Purple");
    break;
  case "rainbow":
    colorGradient = color.rainbow;
    colorChalk = chalk.hex('#0cb3eb');
    htmlColors = ["#E203B2", "#06DBF7", "#F70606"]
    logTheme("Rainbow");
    break;
  case "orange":
    colorGradient = color("#ff8c08", "#ffad08", "#f5bb47");
    colorChalk = chalk.hex('#ff8400');
    htmlColors = ["#ff8c08", "#ffad08", "#f5bb47"]
    logTheme("Orange");
    break;
  case "red":
    colorGradient = color("#ff0000", "#ff0026");
    colorChalk = chalk.hex("#ff4747");
    htmlColors = ["#ff0000", "#ff4747", "#ff0026"]
    logTheme("Red");
    break;
    // You can add your own default themes here, using the same method above and using hex color
  default:
    colorGradient = color.fruit;
    colorChalk = color("#EB0000", "#D80606", "#E5A800");
    htmlColors = ["#bc6107", "#fe8916", "#ff952a"];
    logUnknownTheme(config.THEME_SETUP.THEME);
}

fs.readFile('./config.json', 'utf8', (err, data) => {
  if (err) return console.error(err);
  const config = JSON.parse(data);
  config.THEME_SETUP.HTML = htmlColors;
  fs.writeFile('./config.json', JSON.stringify(config, null, 2), err => err ? console.error(err) : /*console.log('config.json updated!')*/ "" );
});

function getTheme() {
  return {
    gradient: colorGradient,
    color: colorChalk,
    html,
  }
}

// Display theme information
function logTheme(theme) {
  if (!config.THEME_SETUP.THEME) {
    console.log(`The "THEME" property in the config is empty. To apply a custom theme, please provide one.`);
  }
}

// Shows up if unknown theme is used
function logUnknownTheme(theme) {
  console.log(`The theme "${theme}" is not recognized. Using the default theme instead.`);
};

async function checkForUpdates() {
  // Load local package.json version
  const localPackagePath = path.join(__dirname, "../package.json");
  const localPackage = JSON.parse(fs.readFileSync(localPackagePath, "utf8"));
  const localVersion = localPackage.version;

  // URL for remote package.json
  const remotePackageUrl = "https://raw.githubusercontent.com/YANDEVA/Pagebot/refs/heads/main/package.json";

  try {
    // Fetch remote package.json
    const response = await axios.get(remotePackageUrl);
    const remoteVersion = response.data.version;

    // Compare versions
    if (remoteVersion !== localVersion) {
      // Check if local version is ahead
      const localParts = localVersion.split('.').map(Number);
      const remoteParts = remoteVersion.split('.').map(Number);

      let isLocalNewer = false;
      for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
        const localPart = localParts[i] || 0;
        const remotePart = remoteParts[i] || 0;

        if (localPart > remotePart) {
          isLocalNewer = true;
          break;
        } else if (localPart < remotePart) {
          isLocalNewer = false;
          break;
        }
      }

      if (isLocalNewer) {
        setTimeout(() => {
          console.log(`${colorGradient(`SYSTEM:`)} Your local version (${colorGradient(localVersion)}) is ahead of the remote version (${colorGradient(remoteVersion)}).`);
          console.log(`${colorGradient(`SYSTEM:`)} You may be using a development or unreleased version.`);
        }, 4500);
      } else {
        setTimeout(() => {
          console.log(`${colorGradient(`SYSTEM:`)} A new version is available! Local: ${colorGradient(localVersion)}, Remote: ${colorGradient(remoteVersion)}`);
          console.log(`${colorGradient(`SYSTEM:`)} Update now! ${colorGradient(`https://github.com/YANDEVA/Pagebot`)}`);
        }, 4500);
      }
    }
  } catch (error) {
    console.error("Failed to check for updates:", error.message);
  }
}

// Main log function with theme and admin information display
function log() {
  // Call the update checker function
  checkForUpdates();

  const title = config.THEME_SETUP.TITLE || "";
  const asciiTitle = generateAsciiArt(title);
  console.log(colorGradient.multiline(asciiTitle));
  setTimeout(() => {
    console.log(
      // colorGradient(" ❱ ") + "Credits to",
      // colorChalk("Yan Maglinte"),
      colorGradient(" ❱ ") + `Admin: ${colorChalk(adminName)}`,
    );

    function loadModules(commandsPath, eventsPath) {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
      const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
      let validCommands = 0;
      let validEvents = 0;

      console.log(`\nLoading ${commandFiles.length} command(s) and ${eventFiles.length} event(s)...`);

      // Display loading bar
      loadingBar(1500, colorGradient); // Adjust duration as needed

      // Load and validate commands
      commandFiles.forEach(file => {
        const commandPath = path.join(commandsPath, file);
        const command = require(commandPath);

        let missingProperties = [];
        // Check for missing properties in command
        if (!command.config) {
          missingProperties.push("config object");
        } else {
          if (typeof command.config.name !== "string") missingProperties.push("name");
          if (typeof command.config.usePrefix !== "boolean") missingProperties.push("usePrefix");
          if (typeof command.config.adminOnly !== "boolean") missingProperties.push("adminOnly");
          if (typeof command.config.category !== "string") missingProperties.push("category");
          if (typeof command.config.version !== "string") missingProperties.push("version");
          if (typeof command.config.author !== "string") missingProperties.push("author");
        }

        // Log details about each command
        if (missingProperties.length === 0) {
          validCommands++;
          console.log(
            `${colorChalk(`✔`)} Command Loaded: ${colorChalk(command.config.name)}`
          );
        } else {
          console.log(
            `${chalk.red(`✘`)} Invalid Command: ${file} - Missing properties: ${missingProperties.join(", ")}`
          );
        }
      });

      // Load and validate events
      eventFiles.forEach(file => {
        const eventPath = path.join(eventsPath, file);
        const event = require(eventPath);

        let missingProperties = [];
        // Check for missing properties in event
        if (!event.config) {
          missingProperties.push("config object");
        } else {
          if (typeof event.config.name !== "string") missingProperties.push("name");
          if (typeof event.config.selfListen !== "boolean") missingProperties.push("selfListen");
        }

        // Log details about each event
        if (missingProperties.length === 0) {
          validEvents++;
          console.log(
            `${colorChalk(`✔`)} Event Loaded: ${colorChalk(event.config.name)}`
          );
        } else {
          console.log(
            `${chalk.red(`✘`)} Invalid Event: ${file} - Missing properties: ${missingProperties.join(", ")}`
          );
        }
      });

      console.log(`\nTotal Commands Loaded: ${validCommands}/${commandFiles.length}`);
      console.log(`Total Events Loaded: ${validEvents}/${eventFiles.length}\n`);
    }

    // Usage
    const commandsPath = path.join(__dirname, "../modules/scripts/commands");
    const eventsPath = path.join(__dirname, "../modules/scripts/events");

    loadModules(commandsPath, eventsPath);
  }, 500);
}

function verify(req, res) {
  const config = JSON.parse(fs.readFileSync("./config.json"), "utf8");
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.VERIFY_TOKEN) {
    console.log(getTheme().gradient(`SYSTEM:`), "WEBHOOK VERIFIED!");
    res.status(200).send(challenge);
  } else {
    console.error("Verification failed. Make sure the tokens match.");
    res.sendStatus(403);
  }
}

module.exports = {
  html,
  log,
  verify,
  getTheme,
};
