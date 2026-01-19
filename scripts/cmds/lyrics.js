const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "lyrics",
  author: "Christus dev AI / Nix Adapt",
  version: "1.2.0",
  description: "Récupère les paroles d'une chanson avec l'artiste et l'image.",
  category: "Search",
  usage: "lyrics <nom de la chanson>",
  prefix: false,
};

// Fonction utilitaire pour télécharger l'image (comme dans fastx)
async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function onStart({ bot, message, chatId, args }) {
  const query = args.join(" ");

  if (!query) {
    return message.reply("⚠️ Veuillez fournir le nom d'une chanson !\nExemple : lyrics apt");
  }

  try {
    // Appel à l'API de paroles
    const { data } = await axios.get(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
    );

    if (!data || !data.lyrics) {
      return message.reply("❌ Paroles non trouvées.");
    }

    const lyricsText = `🎼 **Titre :** ${data.track_name}\n👤 **Artiste :** ${data.artist_name}\n\n${data.lyrics}\n\n✨ *Généré par Nix Bot*`;

    // Chemin temporaire pour l'image
    const cacheFolder = path.join(__dirname, "tmp");
    if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);
    const imagePath = path.join(cacheFolder, `lyrics_${Date.now()}.jpg`);

    try {
      // Téléchargement et envoi avec bot.sendPhoto
      await downloadImage(data.artwork_url, imagePath);

      await bot.sendPhoto(chatId, imagePath, {
        caption: lyricsText.length > 1024 ? lyricsText.substring(0, 1021) + "..." : lyricsText,
        parse_mode: "Markdown"
      });

      // Si les paroles sont trop longues pour une légende (limite Telegram 1024 char)
      if (lyricsText.length > 1024) {
        await message.reply(lyricsText);
      }

      fs.unlinkSync(imagePath);
    } catch (imgErr) {
      // Fallback si l'image échoue : envoi du texte seul
      await message.reply(lyricsText);
    }

  } catch (err) {
    console.error("Lyrics Error:", err.message);
    message.reply("❌ Erreur : Impossible de récupérer les paroles.");
  }
}

module.exports = { nix, onStart };
