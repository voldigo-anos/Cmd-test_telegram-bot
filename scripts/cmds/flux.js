const axios = require("axios");

const nix = {
  name: "flux",
  version: "1.0.0",
  aliases: ["img", "gen"],
  description: "Generate an AI image using Flux API.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 8,
  guide: "{p}flux <prompt> [ratio]\nExample: {p}flux cat 1:1",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply("❗ Please provide a prompt.\nUsage: {p}flux <text> [ratio]");
  }

  // Default ratio
  let ratio = "1:1";

  // If last argument looks like a ratio
  const last = args[args.length - 1];
  if (/^\d+:\d+$/.test(last)) {
    ratio = last;
    args.pop();
  }

  const prompt = args.join(" ");

  const waitMsg = await message.reply("🎨 Generating your image...");

  try {
    const apiUrl = `https://api.nekolabs.web.id/ai/flux/dev?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.success || !res.data.result) {
      throw new Error("API returned an invalid response.");
    }

    const imageUrl = res.data.result;

    // Editing the wait message
    await bot.editMessageText("📤 Sending image...", {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🖼️ *Prompt:* ${prompt}\n📐 Ratio: ${ratio}`,
      parse_mode: "Markdown"
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("Flux Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
