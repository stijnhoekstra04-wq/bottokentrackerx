// TokenTrackerX Bot
// Admin: @s0318

require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.BOT_ADMIN_ID);

// Betaal adressen
const BTC = process.env.BTC_ADDRESS;
const ETH = process.env.ETH_ADDRESS;
const SOL = process.env.SOL_ADDRESS;

// Data opslag
const USERS_FILE = "users.json";
let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};

// Opslaan helper
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helpers
function isAdmin(ctx) {
  return ctx.from.id === ADMIN_ID;
}

function premiumStatus(id) {
  const user = users[id];
  if (!user) return false;
  if (!user.premium) return false;
  if (user.expires && new Date() > new Date(user.expires)) {
    user.premium = false;
    saveUsers();
    return false;
  }
  return true;
}

// ---------- Commands ----------

// Start
bot.start((ctx) => {
  const id = ctx.from.id;
  users[id] = users[id] || { username: ctx.from.username, premium: false, notes: [], watchlist: [], alerts: [] };
  saveUsers();

  ctx.replyWithPhoto({ source: "banner.jpg" }, {
    caption: "👋 Welkom bij *TokenTrackerX*\nJouw alles-in-één crypto tool.\n\nBeheer door: @s0318",
    parse_mode: "Markdown"
  });

  ctx.replyWithMarkdown(`
🔓 *Gratis functies*
- ✅ Volg tot 3 tokens
- ✅ 5 notities opslaan
- ✅ 1 prijs alert
- ✅ Basis coin info

💎 *Premium functies*
- 🚀 Onbeperkt tokens volgen
- 📝 Onbeperkt notities opslaan
- 🔔 Meerdere alerts tegelijk
- 🕵️ Rug/Scam checks
- 📢 Premium-only announcements
- 🤖 Slimme samenvatting van notities

💳 *Abonnementen*
- $5 per maand
- $35 lifetime

👉 Gebruik /subscribe om Premium te worden  
📩 Support: @s0318
  `);
});

// Subscribe
bot.command("subscribe", (ctx) => {
  ctx.replyWithMarkdown(`
💳 *Abonneren op Premium*  

Stuur betaling naar een van deze adressen:  

₿ BTC: \`${BTC}\`  
Ξ ETH: \`${ETH}\`  
◎ SOL: \`${SOL}\`  

Na betaling: stuur TXID naar @s0318 ter bevestiging.  
`);
});

// Premium status
bot.command("premiumstatus", (ctx) => {
  ctx.reply(premiumStatus(ctx.from.id) ? "✅ Jij hebt Premium!" : "❌ Jij hebt GEEN Premium. Gebruik /subscribe.");
});

// -------- Watchlist --------
bot.command("addwatch", (ctx) => {
  const id = ctx.from.id;
  const token = ctx.message.text.split(" ")[1];
  if (!token) return ctx.reply("Gebruik: /addwatch TOKEN");

  const limit = premiumStatus(id) ? Infinity : 3;
  if (users[id].watchlist.length >= limit) return ctx.reply("⚠️ Limiet bereikt. Upgrade naar Premium!");

  users[id].watchlist.push(token.toUpperCase());
  saveUsers();
  ctx.reply(`✅ ${token.toUpperCase()} toegevoegd aan jouw watchlist.`);
});

bot.command("watchlist", (ctx) => {
  const list = users[ctx.from.id].watchlist;
  if (!list.length) return ctx.reply("📭 Je watchlist is leeg.");
  ctx.reply("📊 Jouw watchlist:\n" + list.join(", "));
});

// -------- Notes --------
bot.command("addnote", (ctx) => {
  const id = ctx.from.id;
  const note = ctx.message.text.replace("/addnote", "").trim();
  if (!note) return ctx.reply("Gebruik: /addnote jouw tekst");

  const limit = premiumStatus(id) ? Infinity : 5;
  if (users[id].notes.length >= limit) return ctx.reply("⚠️ Notitie-limiet bereikt. Upgrade naar Premium!");

  users[id].notes.push(note);
  saveUsers();
  ctx.reply("📝 Notitie opgeslagen!");
});

bot.command("notes", (ctx) => {
  const notes = users[ctx.from.id].notes;
  if (!notes.length) return ctx.reply("📭 Je hebt nog geen notities.");
  ctx.reply("📝 Jouw notities:\n" + notes.map((n, i) => `${i+1}. ${n}`).join("\n"));
});

// -------- Alerts (stub, handmatig) --------
bot.command("addalert", (ctx) => {
  const id = ctx.from.id;
  const parts = ctx.message.text.split(" ");
  if (parts.length < 3) return ctx.reply("Gebruik: /addalert TOKEN PRIJS");

  const token = parts[1].toUpperCase();
  const price = parts[2];

  const limit = premiumStatus(id) ? Infinity : 1;
  if (users[id].alerts.length >= limit) return ctx.reply("⚠️ Alert-limiet bereikt. Upgrade naar Premium!");

  users[id].alerts.push({ token, price });
  saveUsers();
  ctx.reply(`🔔 Alert ingesteld: ${token} → ${price}`);
});

bot.command("alerts", (ctx) => {
  const alerts = users[ctx.from.id].alerts;
  if (!alerts.length) return ctx.reply("📭 Je hebt geen alerts ingesteld.");
  ctx.reply("🔔 Jouw alerts:\n" + alerts.map((a, i) => `${i+1}. ${a.token} @ ${a.price}`).join("\n"));
});

// -------- Admin Commands --------
bot.command("addpremium", (ctx) => {
  if (!isAdmin(ctx)) return;
  const username = ctx.message.text.split(" ")[1];
  if (!username) return ctx.reply("Gebruik: /addpremium @username");

  const entry = Object.entries(users).find(([id, u]) => `@${u.username}` === username);
  if (!entry) return ctx.reply("User niet gevonden.");

  const [id, u] = entry;
  u.premium = true;
  u.expires = null;
  saveUsers();
  ctx.reply(`✅ ${username} is nu Premium.`);
  bot.telegram.sendMessage(id, "🎉 Je Premium is geactiveerd door admin!");
});

bot.command("removepremium", (ctx) => {
  if (!isAdmin(ctx)) return;
  const username = ctx.message.text.split(" ")[1];
  if (!username) return ctx.reply("Gebruik: /removepremium @username");

  const entry = Object.entries(users).find(([id, u]) => `@${u.username}` === username);
  if (!entry) return ctx.reply("User niet gevonden.");

  const [id, u] = entry;
  u.premium = false;
  u.expires = null;
  saveUsers();
  ctx.reply(`❌ ${username} Premium verwijderd.`);
  bot.telegram.sendMessage(id, "⚠️ Je Premium is verwijderd door admin.");
});

bot.command("announce", (ctx) => {
  if (!isAdmin(ctx)) return;
  const text = ctx.message.text.replace("/announce", "").trim();
  if (!text) return ctx.reply("Gebruik: /announce jouw_bericht");

  for (let id in users) {
    bot.telegram.sendMessage(id, `📢 Announcement:\n\n${text}`);
  }
  ctx.reply("✅ Announcement verstuurd.");
});

bot.command("announcepremium", (ctx) => {
  if (!isAdmin(ctx)) return;
  const text = ctx.message.text.replace("/announcepremium", "").trim();
  if (!text) return ctx.reply("Gebruik: /announcepremium jouw_bericht");

  for (let id in users) {
    if (premiumStatus(id)) {
      bot.telegram.sendMessage(id, `📢 Premium Announcement:\n\n${text}`);
    }
  }
  ctx.reply("✅ Premium announcement verstuurd.");
});

// ---------- Run ----------
// ---------- Help Command ----------
bot.command("help", (ctx) => {
  ctx.reply(`
📜 Beschikbare commands:

*Algemene Commands*
/start - Start bot
/subscribe - Premium info
/premiumstatus - Check status

*Watchlist Commands*
/addwatch TOKEN - Voeg token toe
/watchlist - Bekijk watchlist

*Notes Commands*
/addnote jouw_tekst - Voeg notitie toe
/notes - Bekijk notities

*Alerts Commands*
/addalert TOKEN PRIJS - Voeg alert toe
/alerts - Bekijk alerts

*Admin Commands* (alleen voor admin)
/addpremium @username
/removepremium @username
/announce bericht
/announcepremium bericht
  `, { parse_mode: "Markdown" });
});

bot.launch();
console.log("🚀 TokenTrackerX draait nu...");
