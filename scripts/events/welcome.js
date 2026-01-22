const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Chemins des polices (adapte les selon ton dossier assets)
const fontDir = path.join(process.cwd(), "assets", "fonts");
if (fs.existsSync(path.join(fontDir, "NotoSans-Bold.ttf"))) {
    registerFont(path.join(fontDir, "NotoSans-Bold.ttf"), { family: 'NotoSans', weight: 'bold' });
}

module.exports = {
  nix: {
    name: "welcome",
    description: "Gère l'accueil des membres avec une image personnalisée.",
    type: "welcome",
    author: "Christus"
  },

  async onStart({ bot, msg }) {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members;

    if (!newMembers) return;

    try {
        const botInfo = await bot.getMe();
        const chatInfo = await bot.getChat(chatId);
        const title = chatInfo.title || "le groupe";

        for (const member of newMembers) {
            // 1. Si le bot est ajouté
            if (member.id === botInfo.id) {
                return bot.sendMessage(chatId, `🎉 ${botInfo.first_name} est connecté !\nMerci de m'avoir ajouté à ${title}.`);
            }

            // 2. Préparation des données pour l'image
            const memberName = member.first_name || "Membre";
            const memberCount = await bot.getChatMemberCount(chatId);
            
            // Récupération de la photo de profil (si elle existe)
            let avatarUrl = "https://i.imgur.com/6V9i39X.png"; // Avatar par défaut
            try {
                const photos = await bot.getUserProfilePhotos(member.id);
                if (photos.total_count > 0) {
                    const fileId = photos.photos[0][0].file_id;
                    avatarUrl = await bot.getFileLink(fileId);
                }
            } catch (e) { console.log("Pas de photo de profil"); }

            // 3. Génération de l'image Canvas
            const imagePath = await createWelcomeImage(memberName, title, memberCount, avatarUrl);

            // 4. Envoi de l'image
            await bot.sendPhoto(chatId, imagePath, {
                caption: `Bienvenue ${memberName} sur ${title} !\nTu es notre ${memberCount}e membre. 🥳`
            });

            // Nettoyage
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
    } catch (error) {
        console.error('Erreur Welcome Nix:', error);
    }
  }
};

async function createWelcomeImage(userName, groupName, count, avatarUrl) {
    const width = 1000;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fond sombre
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Dégradé décoratif
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Dessin de l'avatar circulaire
    try {
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, 150, 100, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, width / 2 - 100, 50, 200, 200);
        ctx.restore();
        
        // Bordure de l'avatar
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(width / 2, 150, 100, 0, Math.PI * 2);
        ctx.stroke();
    } catch (e) { console.log("Erreur chargement avatar canvas"); }

    // Textes
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Welcome
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('WELCOME', width / 2, 320);

    // Nom de l'utilisateur
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(userName, width / 2, 380);

    // Infos groupe
    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Bienvenue dans ${groupName}`, width / 2, 430);
    ctx.fillText(`Membre #${count}`, width / 2, 470);

    // Sauvegarde temporaire
    const filePath = path.join(__dirname, `welcome_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    return filePath;
}
