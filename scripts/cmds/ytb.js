const axios = require("axios");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");
const moment = require("moment-timezone");

module.exports = {
  nix: {
    name: "youtube",
    aliases: ["ytb", "yt", "play"],
    version: "1.0.0",
    author: "Christus",
    role: 0,
    category: "média",
    description: "Recherche et télécharge des vidéos ou de l'audio YouTube.",
    cooldown: 5,
    guide: "{p}youtube -v [recherche] (pour vidéo)\n{p}youtube -a [recherche] (pour audio)"
  },

  async onStart({ bot, msg, chatId, args }) {
    const mode = args[0];
    const query = args.slice(1).join(" ");

    if (!["-v", "-a"].includes(mode)) {
      return bot.sendMessage(chatId, "❌ Utilisation : /youtube -v [nom] ou /youtube -a [nom]");
    }
    if (!query) {
      return bot.sendMessage(chatId, "❌ Veuillez fournir une recherche ou un lien YouTube.");
    }

    try {
      // 1. Récupération de l'API de téléchargement
      const apiConfigRes = await axios.get("https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json");
      const apiBase = apiConfigRes.data.api;

      // 2. Recherche YouTube
      const searchRes = await yts(query);
      const video = searchRes.videos[0]; // On prend le premier résultat pour simplifier

      if (!video) {
        return bot.sendMessage(chatId, "❌ Aucun résultat trouvé.");
      }

      const type = mode === "-v" ? "mp4" : "mp3";
      const waitMsg = await bot.sendMessage(chatId, `⏳ Préparation du fichier ${type}...\n🎵 Titre : ${video.title}\n⏱️ Durée : ${video.timestamp}`);

      // 3. Appel à l'API de téléchargement
      const downloadRes = await axios.get(`${apiBase}/yx?url=${encodeURIComponent(video.url)}&type=${type}`);
      const downloadUrl = downloadRes.data?.download_url;

      if (!downloadRes.data?.status || !downloadUrl) {
        throw new Error("Erreur API");
      }

      // 4. Téléchargement local
      const filePath = path.join(__dirname, `yt_${Date.now()}.${type}`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios({ url: downloadUrl, responseType: "stream" });

      response.data.pipe(writer);

      writer.on("finish", async () => {
        try {
          // 5. Envoi sur Telegram
          if (type === "mp3") {
            await bot.sendAudio(chatId, filePath, { title: video.title, performer: "Nix YouTube" });
          } else {
            await bot.sendVideo(chatId, filePath, { caption: video.title });
          }
          
          bot.deleteMessage(chatId, waitMsg.message_id);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          bot.sendMessage(chatId, "❌ Erreur lors de l'envoi du fichier.");
        }
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "❌ Erreur lors du téléchargement du média.");
      });

    } catch (error) {
      console.error("Erreur YouTube:", error);
      bot.sendMessage(chatId, "❌ Une erreur est survenue. L'API est peut-être saturée.");
    }
  }
};
