const axios = require("axios");

const nix = {
  name: "lyrics",
  version: "1.2.2",
  author: "Christus dev AI",
  role: 0,
  category: "Search",
  description: "Récupérer les paroles via Musixmatch",
  guide: "<nom de la chanson>",
  cooldown: 5,
};

async function onStart({ bot, args, chatId }) {
  const query = args.join(" ").trim();

  if (!query) {
    return bot.sendMessage(chatId, "⚠️ Veuillez fournir le nom d'une chanson !\nExemple : lyrics Imagine");
  }

  try {
    // Utilisation de l'endpoint Musixmatch qui est plus stable
    const response = await axios.get(
      `https://lyricstx.vercel.app/musixmatch/lyrics?title=${encodeURIComponent(query)}`
    );

    const data = response.data;

    // Vérification stricte du contenu
    if (!data || !data.lyrics || data.lyrics.includes("not found") || data.lyrics.length < 10) {
      return bot.sendMessage(chatId, "❌ Paroles non trouvées sur Musixmatch. Essayez d'être plus précis (Artiste - Titre).");
    }

    const caption = `🎼 **${data.track_name.toUpperCase()}**\n` +
      `👤 **Artiste** : ${data.artist_name}\n` +
      `🔍 **Source** : ${data.search_engine}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `${data.lyrics}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🌌 *ChristusBot*`;

    if (data.artwork_url && data.artwork_url.startsWith("http")) {
      try {
        const imageRes = await axios.get(data.artwork_url, { responseType: "stream" });
        return bot.sendPhoto(chatId, imageRes.data, { caption });
      } catch (imgError) {
        return bot.sendMessage(chatId, caption);
      }
    } else {
      return bot.sendMessage(chatId, caption);
    }

  } catch (error) {
    console.error("Lyrics error:", error);
    return bot.sendMessage(chatId, "❌ Erreur de connexion à l'API. Réessayez dans un instant.");
  }
}

module.exports = {
  nix,
  onStart,
};
