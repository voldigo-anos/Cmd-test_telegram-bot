const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const nix = {
  name: "nijiv5",
  aliases: ["niji"],
  version: "2.0.0",
  author: "Vincenzo | Christus Dev",
  cooldown: 20,
  role: 2,
  prefix: true,
  category: "AI",
  description: "Generate Niji v5 anime-style images",
  guide:
    "{p}nijiv5 <prompt> [--ar <ratio>] [--1]\n" +
    "Example: {p}nijiv5 a magical girl --ar 16:9 --1",
};

async function onStart({ bot, message, msg, chatId, args, input }) {
  if (!args.length) return message.reply("❌ Please provide a prompt.");

  let prompt = "";
  let ratio = "1:1";
  let single = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ar" && args[i + 1]) {
      ratio = args[++i];
    } else if (args[i] === "--1") {
      single = true;
    } else {
      prompt += args[i] + " ";
    }
  }
  prompt = prompt.trim();
  if (!prompt) return message.reply("❌ Please provide a prompt.");

  const waitMsg = await bot.sendMessage(chatId, "🎨 Generating images, please wait...", {
    reply_to_message_id: msg.message_id,
  });

  try {
    /* ===== FETCH TOKEN ===== */
    const apiCfg = await axios.get(
      "https://raw.githubusercontent.com/Savage-Army/extras/refs/heads/main/api.json"
    );
    const tokenUrl = apiCfg.data.token;
    const tokenRes = await axios.get(tokenUrl);
    const token = tokenRes.data.bearer;

    const params = { prompt, ratio, token };
    const calls = single ? 1 : 4;

    /* ===== GENERATE IMAGES ===== */
    const results = await Promise.all(
      Array.from({ length: calls }).map(() =>
        axios.get("https://vincenzojin-hub-1.onrender.com/nijiv5/gen", { params })
      )
    );

    const imageUrls = results.flatMap(r => r.data.imageUrls);
    if (!imageUrls.length) throw new Error("No images returned from API");

    /* ===== DOWNLOAD ===== */
    const paths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const p = path.join(TMP_DIR, `niji_${Date.now()}_${i}.jpg`);
      const res = await axios.get(imageUrls[i], { responseType: "stream" });
      await new Promise((ok, err) => {
        const w = fs.createWriteStream(p);
        res.data.pipe(w);
        w.on("finish", ok);
        w.on("error", err);
      });
      paths.push(p);
    }

    await bot.deleteMessage(chatId, waitMsg.message_id);

    /* ===== SINGLE IMAGE ===== */
    if (single) {
      return bot.sendPhoto(chatId, fs.createReadStream(paths[0]), {
        caption: `🌸 **Image generated**\n🧠 Prompt: ${prompt}`,
        reply_to_message_id: msg.message_id,
      });
    }

    /* ===== COMBINE 4 IMAGES ===== */
    const imgs = await Promise.all(paths.map(p => loadImage(p)));
    const w = imgs[0].width;
    const h = imgs[0].height;

    const canvas = createCanvas(w * 2, h * 2);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(imgs[0], 0, 0, w, h);
    ctx.drawImage(imgs[1], w, 0, w, h);
    ctx.drawImage(imgs[2], 0, h, w, h);
    ctx.drawImage(imgs[3], w, h, w, h);

    const combined = path.join(TMP_DIR, `niji_grid_${Date.now()}.jpg`);
    fs.writeFileSync(combined, canvas.toBuffer("image/jpeg"));

    const sent = await bot.sendPhoto(chatId, fs.createReadStream(combined), {
      caption:
        `🧠 Prompt: ${prompt}\n` +
        `①   ②\n③   ④\nReply with 1–4 to select your preferred image.`,
      reply_to_message_id: msg.message_id,
    });

    /* ===== SET REPLY HANDLER ===== */
    input.setReply(sent.message_id, {
      key: "nijiv5",
      images: paths,
      author: input.senderID,
    });
  } catch (e) {
    console.error("NIJI ERROR:", e);
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    message.reply("❌ Failed to generate image. Please try again later.", {
      reply_to_message_id: msg.message_id,
    });
  }
}

/* ===== REPLY HANDLER ===== */
async function onReply({ bot, message, msg, chatId, input, repObj }) {
  if (input.senderID !== repObj.author) return;

  const index = parseInt(msg.text);
  if (isNaN(index) || index < 1 || index > 4) {
    return bot.sendMessage(chatId, "❌ Invalid choice. Use 1–4 only.", {
      reply_to_message_id: msg.message_id,
    });
  }

  await bot.sendPhoto(chatId, fs.createReadStream(repObj.images[index - 1]), {
    reply_to_message_id: msg.message_id,
  });
}

module.exports = {
  nix,
  onStart,
  onReply,
};
