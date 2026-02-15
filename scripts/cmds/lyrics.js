const axios = require("axios");

const nix = {
  name: "lyrics",
  version: "1.2.0",
  author: "Christus dev AI",
  role: 0,
  category: "Search",
  description: "Retrieve song lyrics with artist and artwork",
  guide: "<song name>",
  cooldown: 5,
};

async function onStart({ bot, args, chatId }) {
  const query = args.join(" ").trim();

  if (!query) {
    return bot.sendMessage(chatId, "⚠️ Veuillez fournir le nom d'une chanson !\nExemple : lyrics apt");
  }

  try {
    const response = await axios.get(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
    );

    const data = response.data;

    if (!data || !data.lyrics) {
      return bot.sendMessage(chatId, "❌ Paroles non trouvées.");
    }

    const caption = `✨ Lyrics Transmission\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎼 Titre   : ${data.track_name}\n` +
      `👤 Artiste : ${data.artist_name}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `${data.lyrics}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🌌 ChristusBot`;

    // Tentative d'envoi avec l'artwork
    if (data.artwork_url) {
      try {
        const imageRes = await axios.get(data.artwork_url, { responseType: "stream" });
        return bot.sendPhoto(chatId, imageRes.data, { caption });
      } catch (imgError) {
        // Fallback texte si l'image échoue
        return bot.sendMessage(chatId, caption);
      }
    } else {
      return bot.sendMessage(chatId, caption);
    }

  } catch (error) {
    console.error("Lyrics error:", error);
    return bot.sendMessage(chatId, "❌ Erreur : Impossible de récupérer les paroles.");
  }
}

module.exports = {
  nix,
  onStart,
};
