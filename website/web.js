const path = require("path");
const gradient = require("gradient-string");
const chalk = require("chalk");

function html(res) {
  res.sendFile(path.join(__dirname, "index.html"));
}

function verify(req, res) {
  const config = require("../config.json");
  const verifyToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken) {
    res.status(200).send(req.query["hub.challenge"]);
  } else { res.sendStatus(403); }
}

function log() {
  const banner = `
   █████╗ ███╗   ███╗██████╗ ██╗   ██╗███████╗
  ██╔══██╗████╗ ████║██╔══██╗██║   ██║██╔════╝
  ███████║██╔████╔██║██║  ██║██║   ██║███████╗
  ██╔══██║██║╚██╔╝██║██║  ██║██║   ██║╚════██║
  ██║  ██║██║ ╚═╝ ██║██████╔╝╚██████╔╝███████║
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝
  `;
  console.log(gradient.pastel.multiline(banner));
  console.log(chalk.cyan(`[ SYSTEM ] Amdusbot V14.0 - Active`));
  console.log(chalk.green(`[ SERVER ] Listening on Port 8080`));
}

function getTheme() { return { gradient: gradient.fruit, color: chalk.blue }; }

module.exports = { html, verify, log, getTheme };
