const axios = require("axios");

const nix = {
  name: "ai",
  version: "1.0.0",
  description: "Chat with AI using the Nekolabs API.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 3,
  guide: "{p}ai <your question>",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply("❗ Please provide a message.\nUsage: {p}ai <text>");
  }

  const userText = args.join(" ");

  // Message de chargement
  const waitMsg = await message.reply("🤖 Thinking...");

  try {
    const apiUrl = `https://api.nekolabs.web.id/ai/ai4chat/chat?text=${encodeURIComponent(userText)}`;

    const response = await axios.get(apiUrl);

    if (!response.data || !response.data.success) {
      throw new Error("API returned an invalid response.");
    }

    const aiReply = response.data.result;

    // Édite le message
    await bot.editMessageText(`💬 *AI Response:*\n${aiReply}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error("AI Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
