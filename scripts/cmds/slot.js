const fs = require('fs');
const path = require('path');

const nix = {
  name: "slots",
  version: "1.4",
  aliases: ["slot", "machine"],
  description: "Machine à sous ultra-stylée avec probabilités équilibrées.",
  author: "Christus",
  role: 0,
  category: "game",
  cooldown: 8,
  guide: "{p}slots [montant de la mise]"
};

const DAILY_LIMIT = infinity;
const MAX_BET = 6000000;

/* ================= UTILS (BASE DE DONNÉES) ================= */

const getBalanceData = () => {
  const dataPath = path.join(process.cwd(), 'database', 'balance.json');
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({}));
  }
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
    { value: 1e12, suffix: 'T', color: '✨' },
    { value: 1e9, suffix: 'B', color: '💎' },
    { value: 1e6, suffix: 'M', color: '💰' },
    { value: 1e3, suffix: 'k', color: '💵' }
  ];
  const scale = scales.find(s => amount >= s.value);
  if (scale) {
    const scaledValue = amount / scale.value;
    return `${scale.color}${scaledValue.toFixed(2)}${scale.suffix}`;
  }
  return `${amount.toLocaleString()} 💰`;
};

/* ================= ENTRY ================= */

async function onStart({ bot, message, msg, chatId, args }) {
  const userId = msg.from.id;
  const bet = parseInt(args[0]);

  // 1. VERIFICATIONS DE BASE
  if (isNaN(bet) || bet <= 0) {
    return bot.sendMessage(chatId, "🔴 ERREUR : Veuillez entrer une mise valide !");
  }

  if (bet > MAX_BET) {
    return bot.sendMessage(chatId, `🚫 LIMITE : La mise maximale est de ${formatMoney(MAX_BET)}.`);
  }

  let balances = getBalanceData();
  let user = balances[userId] || { money: 0, slotsDay: "", slotsCount: 0 };

  // 2. LIMITE JOURNALIÈRE (Heure locale)
  const today = new Date().toLocaleDateString("fr-FR");
  const isSameDay = today === user.slotsDay;
  const currentCount = isSameDay ? (user.slotsCount || 0) : 0;

  if (currentCount >= DAILY_LIMIT) {
    return bot.sendMessage(chatId, `⏳ LIMITE : Vous avez atteint vos ${DAILY_LIMIT} parties gratuites aujourd'hui. Revenez demain !`);
  }

  if (user.money < bet) {
    return bot.sendMessage(chatId, `🔴 FONDS INSUFFISANTS : Il vous manque ${formatMoney(bet - user.money)} pour jouer !`);
  }

  // 3. LOGIQUE DU SLOT
  const symbols = [
    { emoji: "🍒", weight: 30 },
    { emoji: "🍋", weight: 25 },
    { emoji: "🍇", weight: 20 },
    { emoji: "🍉", weight: 15 },
    { emoji: "⭐", weight: 7 },
    { emoji: "7️⃣", weight: 3 }
  ];

  const roll = () => {
    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const s of symbols) {
      if (random < s.weight) return s.emoji;
      random -= s.weight;
    }
    return symbols[0].emoji;
  };

  const slot1 = roll();
  const slot2 = roll();
  const slot3 = roll();

  let winnings = 0;
  let outcome = "";
  let winType = "";
  let bonusMsg = "";

  if (slot1 === "7️⃣" && slot2 === "7️⃣" && slot3 === "7️⃣") {
    winnings = bet * 10;
    outcome = "🔥 MEGA JACKPOT ! TRIPLE 7️⃣ !";
    winType = "💎 VICTOIRE MAX";
    bonusMsg = "🎆 BONUS : +3% sur votre solde total !";
    user.money = Math.round(user.money * 1.03);
  } else if (slot1 === slot2 && slot2 === slot3) {
    winnings = bet * 5;
    outcome = "💰 JACKPOT ! 3 symboles identiques !";
    winType = "💫 GROS GAIN";
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    winnings = bet * 2;
    outcome = "✨ BIEN ! 2 symboles identiques !";
    winType = "🌟 GAGNÉ";
  } else if (Math.random() < 0.5) {
    winnings = Math.round(bet * 1.5);
    outcome = "🎯 COUP DE CHANCE ! Petit bonus !";
    winType = "🍀 PETIT GAIN";
  } else {
    winnings = -bet;
    outcome = "💸 PLUS DE CHANCE LA PROCHAINE FOIS !";
    winType = "☠️ PERDU";
  }

  // 4. MISE À JOUR DU SOLDE
  user.money += winnings;
  user.slotsDay = today;
  user.slotsCount = currentCount + 1;
  balances[userId] = user;
  saveData(balances);

  // 5. AFFICHAGE VISUEL
  const slotBox =
    "╔═════════════════════╗\n" +
    "║  🎰 MACHINE À SOUS 🎰  ║\n" +
    "╠═════════════════════╣\n" +
    `║     [ ${slot1} | ${slot2} | ${slot3} ]     ║\n` +
    "╚═════════════════════╝";

  const resultEmoji = winnings >= 0 ? "🟢" : "🔴";
  const resultText = winnings >= 0
    ? `🏆 GAGNÉ : ${formatMoney(winnings)}`
    : `💸 PERDU : ${formatMoney(bet)}`;

  const finalMessage =
    `${slotBox}\n\n` +
    `🎯 RÉSULTAT : ${outcome}\n` +
    `${winType ? `${winType}\n` : ""}` +
    `${bonusMsg ? `${bonusMsg}\n` : ""}` +
    `\n${resultEmoji} ${resultText}` +
    `\n💰 NOUVEAU SOLDE : ${formatMoney(user.money)}` +
    `\n🧮 ESSAIS UTILISÉS : ${user.slotsCount}/${DAILY_LIMIT}\n\n` +
    `💡 ASTUCE : Les mises élevées augmentent vos chances !`;

  return bot.sendMessage(chatId, finalMessage);
}

module.exports = {
  nix,
  onStart
};
