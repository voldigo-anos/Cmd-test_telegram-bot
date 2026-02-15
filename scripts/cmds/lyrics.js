const axios = require("axios");

const nix = {
  name: "lyrics",
  version: "1.2.1",
  author: "Christus dev AI",
  role: 0,
  category: "Search",
  description: "Récupérer les paroles d'une chanson avec artwork",
  guide: "<nom de la chanson>",
  cooldown: 5,
};

async function onStart({ bot, args, chatId }) {
  const query = args.join(" ").trim();

  if (!query) {
    return bot.sendMessage(chatId, "⚠️ Veuillez fournir le nom d'une chanson !\nExemple : lyrics apt");
  }

  try {
    // Envoi d'un message d'attente (optionnel mais recommandé pour le feedback)
    const searchingMsg = await bot.sendMessage(chatId, "🔍 Recherche des paroles en cours...");

    const response = await axios.get(
      `https://lyricstx.vercel.app/lyrics?title=${encodeURIComponent(query)}`
    );

    const data = response.data;

    // Correction de la condition : on vérifie si data existe ET si lyrics n'est pas vide
    if (!data || !data.lyrics || data.lyrics.trim() === "") {
      return bot.sendMessage(chatId, "❌ Paroles non trouvées. Essayez d'ajouter le nom de l'artiste.");
    }

    const caption = `✨ **LYRICS TRANSMISSION**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎼 **Titre** : ${data.track_name || 'Inconnu'}\n` +
      `👤 **Artiste** : ${data.artist_name || 'Inconnu'}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `${data.lyrics}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🌌 *ChristusBot*`;

    if (data.artwork_url) {
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
    return bot.sendMessage(chatId, "❌ Erreur : L'API est peut-être hors ligne ou la requête a expiré.");
  }
}

module.exports = {
  nix,
  onStart,
};
