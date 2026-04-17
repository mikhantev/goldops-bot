const express = require('express');
const { Telegraf } = require('telegraf');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);

const menu = require('./menu');
const intake = require('./intake');
const send = require('./send');   // ← Добавили

bot.start((ctx) => menu.showLanguageMenu(ctx));
bot.hears(['🇷🇺 Русский', '🇬🇧 English'], (ctx) => menu.handleLanguage(ctx));
bot.hears(['🔄 Смена языка', '🔄 Change Language'], (ctx) => menu.changeLanguage(ctx));

// Основные действия
bot.hears(['📥 Приём золота', '📥 Gold Intake'], (ctx) => intake.start(ctx));
bot.hears(['📤 Отправка золота', '📤 Send Gold'], (ctx) => send.start(ctx));   // ← Добавили

// Защищённый обработчик текста
bot.on('text', (ctx) => {
  const text = ctx.message.text.trim();
  
  // Игнорируем кнопки, которые уже обработаны выше
  if (['🇷🇺 Русский', '🇬🇧 English', 
       '🔄 Смена языка', '🔄 Change Language',
       '📥 Приём золота', '📥 Gold Intake',
       '📤 Отправка золота', '📤 Send Gold'].includes(text)) {
    return;
  }

  // Всё остальное идёт в intake (или позже можно добавить логику)
  intake.handleText(ctx);
});

bot.on('photo', (ctx) => intake.handlePhoto(ctx));

app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => res.send('✅ GoldOps Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Бот запущен на порту ${PORT}`);
});