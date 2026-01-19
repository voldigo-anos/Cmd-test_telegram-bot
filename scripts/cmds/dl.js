const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "autodl",
    author: "Christus dev AI / Nix Adapt",
    version: "3.0.2",
    description: "Auto-téléchargeur pour YouTube, Spotify, TikTok, Instagram, etc.",
    usage: "autodl [on/off] ou envoyez simplement un lien",
    admin: false,
    vip: false,
    category: "Media",
    prefix: false,
    aliases: ["dl"]
  },

  async onStart({ message, args, event, userId }) {
    // Correction ici : On vérifie l'existence de event et body avec l'option de secours
    const body = event?.body || message?.body || "";
    const match = body.match(/https?:\/\/\S+/i);

    if (args[0] === "on" || args[0] === "off") {
      return message.reply(`✅ Auto-download configuré sur : ${args[0]}`);
    }

    if (match) {
      return await downloadMedia(match[0], message);
    } else if (args.length > 0 && !args[0].startsWith('http')) {
       // Si l'utilisateur a écrit quelque chose qui n'est pas un lien
       return message.reply("⚠️ Veuillez fournir un lien valide.");
    }
  },

  async onChat({ message, event }) {
    // On utilise la même sécurité pour le body ici
    const body = event?.body || message?.body || "";
    if (!body) return;

    const match = body.match(/https?:\/\/\S+/i);
    
    if (match && isSupported(match[0])) {
      await downloadMedia(match[0], message);
    }
  }
};

// --- Fonctions Utilitaires ---

const supportedLinks = {
  youtube: /(youtube\.com|youtu\.be)/i,
  instagram: /(instagram\.com|instagr\.am)/i,
  tiktok: /(tiktok\.com|vm\.tiktok\.com)/i,
  facebook: /(facebook\.com|fb\.watch)/i,
  spotify: /(spotify\.com|spotify\.link)/i
};

function isSupported(url) {
  return Object.values(supportedLinks).some(r => r.test(url));
}

function formatDuration(durationMs) {
  if (!durationMs) return "N/A";
  const totalSeconds = Math.floor(durationMs / 1000);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}m ${sec}s`;
}

async function downloadMedia(url, message) {
  if (!isSupported(url)) return;

  try {
    const apiUrl = `https://downvid.onrender.com/api/download?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl, { timeout: 60000 });
    const data = res.data;

    if (!data || data.status !== "success") return;

    // Extraction des URLs selon la structure de ton API
    const mediaData = data?.data?.data || {};
    const videoUrl = data.video || mediaData.nowm || data.data?.video || null;
    const audioUrl = data.audio || data.data?.audio || null;

    const downloads = [];
    let header = "📥 **Media Auto-DL**\n";

    if (supportedLinks.spotify.test(url)) {
      if (audioUrl) downloads.push({ url: audioUrl, type: "audio" });
      header = "✅ **Spotify Audio** 🎧";
    } else if (supportedLinks.youtube.test(url)) {
      if (videoUrl) downloads.push({ url: videoUrl, type: "video" });
      else if (audioUrl) downloads.push({ url: audioUrl, type: "audio" });
      header = "✅ **YouTube Media** 🎬";
    } else {
      if (videoUrl) downloads.push({ url: videoUrl, type: "video" });
      else if (audioUrl) downloads.push({ url: audioUrl, type: "audio" });
      header = "✅ **Media Download** 🎬";
    }

    if (downloads.length === 0) return;

    const title = mediaData.title || "Sans titre";
    const duration = formatDuration(mediaData.duration_ms || data.duration);
    const caption = `${header}\n\n📌 **Titre :** ${title}\n⏱️ **Durée :** ${duration}`;

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const streams = [];
    const tempFiles = [];

    for (const item of downloads) {
      const ext = item.type === "audio" ? "mp3" : "mp4";
      const tempPath = path.join(cacheDir, `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`);
      
      const response = await axios.get(item.url, { responseType: "arraybuffer" });
      fs.writeFileSync(tempPath, response.data);
      streams.push(fs.createReadStream(tempPath));
      tempFiles.push(tempPath);
    }

    await message.reply({
      body: caption,
      attachment: streams
    });

    // Nettoyage après envoi
    setTimeout(() => {
      tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
    }, 5000);

  } catch (err) {
    console.error("Autodl Error:", err.message);
  }
  }
