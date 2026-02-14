const path = require("path");
const fs = require("fs");

const dataPath = path.join(__dirname, '../../database/prefixes.json');

const getPrefixData = () => {
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}));
        return {};
    }
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
};

const savePrefixData = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const nix = {
    nix: {
        name: "prefix",
        aliases: ["pre"],
        author: "NTKhang / Christus",
        version: "1.4",
        cooldowns: 5,
        role: 0, 
        description: "Changer le préfixe de commande du bot.",
        category: "config",
        guide: "{pn} <nouveau_prefixe> [-g | reset]"
    },

    onStart: async function ({ message, args, chatId, role }) {
        const prefixes = getPrefixData();
        const globalPrefix = global.config.prefix;
        const currentPrefix = prefixes[chatId] || globalPrefix;
        const name = message.from.first_name;

        // Affichage des préfixes si pas d'arguments
        if (!args[0]) {
            return message.reply(`👋 Hey ${msg.from.first_name}, tu m’as demandé mon préfixe ?\n➥ 🌐 Global : ${globalPrefix}\n➥ 💬 Ce groupe : ${currentPrefix}`);
        }

        // Cas du RESET
        if (args[0].toLowerCase() === 'reset') {
            if (prefixes[chatId]) {
                delete prefixes[chatId];
                savePrefixData(prefixes);
            }
            return message.reply(`✅ Hey ${msg.from.first_name}, ton préfixe a été réinitialisé : ${globalPrefix}`);
        }

        const newPrefix = args[0];

        if (newPrefix.length > 3) {
            return message.reply(`❌ Désolé ${name}, le préfixe ne peut pas dépasser 3 caractères.`);
        }

        // Cas du changement GLOBAL (-g)
        if (args[1] === "-g") {
            if (role < 2) { // Supposant que role 2 = Admin Bot
                return message.reply(`❌ Désolé ${name}, seul un admin bot peut changer le préfixe global.`);
            }
            global.config.prefix = newPrefix;
            // Note: Ici il faudrait idéalement sauvegarder dans config.json si nécessaire
            return message.reply(`✅ Hey ${msg.from.first_name}, le préfixe GLOBAL a été changé en : ${newPrefix}`);
        }

        // Changement LOCAL (par groupe)
        prefixes[chatId] = newPrefix;
        savePrefixData(prefixes);

        return message.reply(`✅ Hey ${msg.from.first_name}, le préfixe de ce groupe a été changé en : ${newPrefix}`);
    }
};

module.exports = nix;
