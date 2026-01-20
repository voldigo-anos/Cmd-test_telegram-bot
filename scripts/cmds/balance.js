const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const nix = {
  name: "balance",
  version: "5.1",
  aliases: ["bal", "money", "argent", "cash"],
  description: "Système économique stylé avec transfert et carte bancaire avec avatar.",
  author: "Christus",
  role: 0,
  category: "économie",
  cooldown: 3,
  guide: "{p}bal : voir votre solde\n{p}bal @user : voir le solde d'un ami\n{p}bal t [montant] : transférer (en répondant)"
};

/* ================= GESTION DES DONNÉES ================= */

const getBalanceData = () => {
  const dataPath = path.join(process.cwd(), 'database', 'balance.json');
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

const saveData = (data) => {
  const dataPath = path.join(process.cwd(), 'database', 'balance.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const formatMoney = (amount) => {
  if (isNaN(amount)) return "0 💰";
  amount = Number(amount);
  const scales = [
    { value: 1e15, suffix: 'Q', color: '🌈' },
    { value: 1e12, suffix: 'T', color: '✨' },
    { value: 1e9, suffix: 'B', color: '💎' },
    { value: 1e6, suffix: 'M', color: '💰' },
    { value: 1e3, suffix: 'k', color: '💵' }
  ];
  const scale = scales.find(s => amount >= s.value);
  if (scale) return `${scale.color}${(amount / scale.value).toFixed(1)}${scale.suffix}`;
  return `${amount.toLocaleString()} 💰`;
};

/* ================= LOGIQUE AVATAR ================= */

const fetchAvatar = async (bot, userId) => {
  try {
    const photos = await bot.getUserProfilePhotos(userId);
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const fileLink = await bot.getFileLink(fileId);
      const res = await axios.get(fileLink, { responseType: "arraybuffer" });
      return await loadImage(Buffer.from(res.data));
    }
    throw new Error("No photo");
  } catch (e) {
    // Fallback : Création d'un avatar avec initiale
    const size = 100;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3b0066";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", size / 2, size / 2);
    return canvas;
  }
};

/* ================= LOGIQUE PRINCIPALE ================= */

async function onStart({ bot, msg, chatId, args }) {
  const senderID = msg.from.id;
  const balances = getBalanceData();

  // --- 1. TRANSFERT ---
  if (args[0]?.toLowerCase() === "t") {
    const targetMsg = msg.reply_to_message;
    const amountRaw = args.find(a => !isNaN(a) && a !== args[0]);
    const amount = parseInt(amountRaw);

    if (!targetMsg || isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ Utilisation : Répondez à quelqu'un avec /bal t [montant]");
    }

    const targetID = targetMsg.from.id;
    if (targetID === senderID) return bot.sendMessage(chatId, "❌ Vous ne pouvez pas vous envoyer d'argent.");

    const sender = balances[senderID] || { money: 0 };
    const receiver = balances[targetID] || { money: 0 };

    const tax = Math.ceil(amount * 0.05); // 5% taxe
    const total = amount + tax;

    if (sender.money < total) {
      return bot.sendMessage(chatId, `❌ Fonds insuffisants.\nRequis : ${formatMoney(total)}\nSolde : ${formatMoney(sender.money)}`);
    }

    balances[senderID].money -= total;
    balances[targetID].money = (receiver.money || 0) + amount;
    saveData(balances);

    return bot.sendMessage(chatId, 
      `✅ Transfert réussi ! 💸\n` +
      `➤ Vers : ${targetMsg.from.first_name}\n` +
      `➤ Montant : ${formatMoney(amount)}\n` +
      `➤ Taxe (5%) : ${formatMoney(tax)}\n` +
      `➤ Total débité : ${formatMoney(total)}`
    );
  }

  // --- 2. CARTE BANCAIRE VISUELLE ---
  let targetID, targetName;
  if (msg.reply_to_message) {
    targetID = msg.reply_to_message.from.id;
    targetName = msg.reply_to_message.from.first_name;
  } else {
    targetID = senderID;
    targetName = msg.from.first_name;
  }

  const userData = balances[targetID] || { money: 0 };
  const money = userData.money || 0;

  try {
    const width = 700, height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(0.5, "#203a43");
    gradient.addColorStop(1, "#2c5364");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Carte semi-transparente
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(40, 40, width - 80, height - 80);

    // Bordure dorée
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Avatar Rond
    const avatar = await fetchAvatar(bot, targetID);
    const avatarSize = 100;
    const avatarX = 70, avatarY = 130;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Titre
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("⚡ CARTE DE SOLDE ⚡", width / 2, 80);

    // Infos texte
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`💎 ${targetName}`, 200, 160);

    ctx.font = "22px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText(`🆔 ${targetID}`, 200, 200);

    // Montant
    ctx.font = "bold 44px Arial";
    ctx.fillStyle = "#00FF7F";
    ctx.textAlign = "center";
    ctx.fillText(`${formatMoney(money)}`, width / 2, 250);

    const filePath = path.join(__dirname, `bal_${targetID}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    await bot.sendPhoto(chatId, filePath, {
      caption: `✨ Infos bancaires de ${targetName} ✨`
    });

    fs.unlinkSync(filePath);

  } catch (error) {
    return bot.sendMessage(chatId, `💰 Solde de ${targetName} : ${formatMoney(money)}`);
  }
}

module.exports = {
  nix,
  onStart
};
