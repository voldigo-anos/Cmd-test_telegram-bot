const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  nix: {
    name: "fs",
    aliases: ["imagen", "art"],
    version: "1.0.0",
    author: "Kay / Christus",
    role: 0,
    category: "dessin",
    description: "Génère une image avec Imagen AI et supporte les ratios.",
    cooldown: 10,
    guide: "{p}fs [description] --r [9:16 | 16:9 | 1:1]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const promptArgs = args.join(" ").trim();

    if (!promptArgs) {
      return bot.sendMessage(chatId, "⚠️ Veuillez fournir une description.\nExemple : /fs robot cyberpunk --r 9:16");
    }

    // Gestion de l'aide
    if (promptArgs.toLowerCase() === "help") {
      const helpText = "🎨 FS - IMAGEN AI GENERATOR\n\n" +
        "💡 Utilisation :\n" +
        "   /fs [description]\n" +
        "   /fs [description] --r [ratio]\n\n" +
        "📐 Ratios supportés :\n" +
        "   --r 9:16, --r 16:9, --r 1:1\n\n" +
        "📝 Exemple :\n" +
        "   /fs dragon warrior --r 16:9";
      return bot.sendMessage(chatId, helpText);
    }

    try {
      // Analyse du ratio et du prompt
      const parts = promptArgs.split(/\s+/);
      let ratio = null;
      let descriptionParts = [];

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "--r" && i + 1 < parts.length) {
          ratio = parts[i + 1];
          i++;
        } else {
          descriptionParts.push(parts[i]);
        }
      }

      let finalPrompt = descriptionParts.join(" ");

      // Ajout des instructions de ratio au prompt pour l'IA
      if (ratio) {
        if (ratio === "9:16") finalPrompt += ", vertical portrait orientation, tall format";
        else if (ratio === "16:9") finalPrompt += ", horizontal landscape orientation, wide format";
        else if (ratio === "1:1") finalPrompt += ", square format";
      }

      const timestamp = moment().tz("Africa/Abidjan").format("HH:mm:ss");
      const waitMsg = await bot.sendMessage(chatId, `🎨 Génération de votre image...\n📐 Ratio : ${ratio || "1:1"}\n⏱️ Début : ${timestamp}`);

      // Appel API
      const apiURL = `https://mj-s6wm.onrender.com/draw?prompt=${encodeURIComponent(finalPrompt)}`;
      const response = await axios.get(apiURL);
      const images = response.data?.images || [];

      if (images.length === 0) {
        return bot.editMessageText("❌ Échec de la génération. Aucune image n'a été retournée par le serveur.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // Téléchargement et envoi
      const imgPath = path.join(__dirname, `fs_${Date.now()}.png`);
      const imageData = await axios.get(images[0], { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(imageData.data));

      await bot.sendPhoto(chatId, imgPath, {
        caption: `✅ Image créée avec succès !${ratio ? `\n📐 Ratio : ${ratio}` : ""}\n🤖 Powered by Imagen AI`
      });

      // Nettoyage
      bot.deleteMessage(chatId, waitMsg.message_id);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    } catch (err) {
      console.error("Erreur FS Generator :", err);
      bot.sendMessage(chatId, "❌ Impossible de générer l'image pour le moment. Réessayez plus tard.");
    }
  }
};
