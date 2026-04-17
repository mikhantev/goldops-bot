const express = require('express');
const { Telegraf } = require('telegraf');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);

const menu = require('./menu');
const intake = require('./intake');

bot.start((ctx) => menu.showLanguageMenu(ctx));
bot.hears(['🇷🇺 Русский', '🇬🇧 English'], (ctx) => menu.handleLanguage(ctx));
bot.hears(['🔄 Смена языка', '🔄 Change Language'], (ctx) => menu.changeLanguage(ctx));
bot.hears(['📥 Приём золота', '📥 Gold Intake'], (ctx) => intake.start(ctx));

// Защищённый обработчик текста
bot.on('text', (ctx) => {
  const text = ctx.message.text.trim();
  
  // Игнорируем все кнопки меню и языка
  if (['🇷🇺 Русский', '🇬🇧 English', '🔄 Смена языка', '🔄 Change Language',
       '📥 Приём золота', '📥 Gold Intake'].includes(text)) {
    return;
  }

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