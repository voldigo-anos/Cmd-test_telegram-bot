const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "lyrics",
  version: "1.2",
  aliases: ["ly"],
  description: "Fetch lyrics of a song",
  author: "Christus",
  prefix: false,
  category: "search",
  type: "anyone",
  cooldown: 5,
  guide: "{p}lyrics <song name>",
};

async function onStart({ bot, message, chatId, args }) {
  const query = args.join(" ");

  if (!query) {
    return message.reply("⚠️ Please provide a song name!\nExample: lyrics apt");
  }

  // Message en attente
  const waitMsg = await message.reply("🎼 Searching for lyrics...");

  try {
    // Appel API
    const { data } = await axios.get(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
    );

    if (!data || !data.lyrics) {
      return bot.editMessageText("❌ Lyrics not found.", {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }

    const { artist_name, track_name, artwork_url, lyrics } = data;

    // Téléchargement de l’image
    const imgPath = path.join(__dirname, "lyrics.jpg");
    const imgResp = await axios.get(artwork_url, { responseType: "stream" });

    const writer = fs.createWriteStream(imgPath);
    imgResp.data.pipe(writer);

    writer.on("finish", async () => {
      // Envoi message Telegram
      await bot.sendPhoto(chatId, imgPath, {
        caption: `🎼 *${track_name}*\n👤 Artist: *${artist_name}*\n\n${lyrics}`,
        parse_mode: "Markdown"
      });

      fs.unlinkSync(imgPath);
      await bot.deleteMessage(chatId, waitMsg.message_id);
    });

    writer.on("error", async () => {
      await bot.editMessageText(
        `🎼 *${track_name}*\n👤 Artist: *${artist_name}*\n\n${lyrics}`,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown"
        }
      );
    });

  } catch (err) {
    console.error("Lyrics Command Error:", err);

    await bot.editMessageText(
      "❌ Error: Unable to fetch lyrics. Please try again later.",
      { chat_id: chatId, message_id: waitMsg.message_id }
    );
  }
}

module.exports = { nix, onStart };
