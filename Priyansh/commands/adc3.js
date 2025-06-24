module.exports.config = {
  name: "7x",
  version: "1.0.1",
  hasPermssion: 2,
  credits: "winner",
  description: "Apply code from URL or upload to GitHub directly",
  commandCategory: "Admin",
  usages: "[filename]",
  cooldowns: 0,
  dependencies: {
    "axios": "",
    "cheerio": "",
    "request": "",
  },
};

module.exports.run = async function ({ api, event, args }) {
  const axios = require("axios");
  const fs = require("fs");
  const cheerio = require("cheerio");
  const request = require("request");
  const { resolve } = require("path");
  const { senderID, threadID, messageID, messageReply, type } = event;

  const GITHUB_TOKEN = "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"; // 🔐 Your token (keep private)
  const GITHUB_REPO = "Swiet16/P-goatbot";
  const GITHUB_BRANCH = "main";

  let name = args[0];
  if (!name) return api.sendMessage("⚠️ Please provide a filename.", threadID, messageID);

  const text = type == "message_reply" ? messageReply.body : null;
  if (!text) return api.sendMessage("⚠️ Please reply to a link (Pastebin, BuildTool, or Drive).", threadID, messageID);

  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return api.sendMessage("⚠️ Invalid link. Please reply with a valid URL.", threadID, messageID);

  const url = urlMatch[0];
  let code = "";

  // Pastebin
  if (url.includes("pastebin")) {
    try {
      const res = await axios.get(url);
      code = res.data;
    } catch {
      return api.sendMessage("⚠️ Could not fetch content from Pastebin.", threadID, messageID);
    }
  }

  // Buildtool.dev or TinyURL
  else if (url.includes("buildtool") || url.includes("tinyurl")) {
    try {
      const res = await axios.get(url);
      const $ = cheerio.load(res.data);
      code = $(".language-js").first().text();
    } catch {
      return api.sendMessage("⚠️ Could not parse BuildTool content.", threadID, messageID);
    }
  }

  // Google Drive
  else if (url.includes("drive.google")) {
    const id = url.match(/[-\w]{25,}/);
    if (!id) return api.sendMessage("⚠️ Invalid Google Drive link.", threadID, messageID);
    const downloadLink = `https://drive.google.com/u/0/uc?id=${id}&export=download`;

    try {
      const res = await axios.get(downloadLink);
      code = res.data;
    } catch {
      return api.sendMessage("⚠️ Failed to download from Google Drive.", threadID, messageID);
    }
  }

  else {
    return api.sendMessage("⚠️ Unsupported link type.", threadID, messageID);
  }

  // GitHub Upload
  const pathInRepo = `Priyansh/commands/${name}.js`;
  const githubApi = `https://api.github.com/repos/${GITHUB_REPO}/contents/${pathInRepo}`;

  try {
    // Check if file already exists
    const existing = await axios.get(githubApi, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const sha = existing.data.sha;

    // Update existing file
    await axios.put(githubApi, {
      message: `🆕 Updated via Messenger Bot`,
      content: Buffer.from(code).toString("base64"),
      branch: GITHUB_BRANCH,
      sha
    }, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    api.sendMessage(`✅ File updated in GitHub: ${name}.js`, threadID, messageID);
  } catch (err) {
    // Create new file if not found
    if (err.response && err.response.status === 404) {
      try {
        await axios.put(githubApi, {
          message: `🆕 Created via Messenger Bot`,
          content: Buffer.from(code).toString("base64"),
          branch: GITHUB_BRANCH,
        }, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        api.sendMessage(`✅ File created in GitHub: ${name}.js`, threadID, messageID);
      } catch (error) {
        return api.sendMessage("❌ Failed to create file in GitHub.", threadID, messageID);
      }
    } else {
      return api.sendMessage("❌ GitHub error. Make sure your token is correct.", threadID, messageID);
    }
  }
};