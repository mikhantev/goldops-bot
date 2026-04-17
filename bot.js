const express = require('express');
const { Telegraf } = require('telegraf');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);

const menu = require('./menu');
const intake = require('./intake');
const send = require('./send');

bot.start(async (ctx) => {
  try {
    await menu.showLanguageMenu(ctx);
  } catch (err) {
    console.error('START ERROR:', err);
  }
});

bot.hears(['🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
  try {
    await menu.handleLanguage(ctx);
  } catch (err) {
    console.error('LANGUAGE ERROR:', err);
    await ctx.reply('Ошибка выбора языка / Language selection error');
  }
});

bot.hears(['🔄 Смена языка', '🔄 Change Language'], async (ctx) => {
  try {
    await menu.changeLanguage(ctx);
  } catch (err) {
    console.error('CHANGE LANGUAGE ERROR:', err);
  }
});

bot.hears(['📥 Приём золота', '📥 Gold Intake'], async (ctx) => {
  try {
    await intake.start(ctx);
  } catch (err) {
    console.error('INTAKE START ERROR:', err);
  }
});

bot.hears(['📤 Отправка золота', '📤 Send Gold'], async (ctx) => {
  try {
    await send.start(ctx);
  } catch (err) {
    console.error('SEND START ERROR:', err);
  }
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();

    if ([
      '🇷🇺 Русский', '🇬🇧 English',
      '🔄 Смена языка', '🔄 Change Language',
      '📥 Приём золота', '📥 Gold Intake',
      '📤 Отправка золота', '📤 Send Gold'
    ].includes(text)) {
      return;
    }

    await intake.handleText(ctx);
  } catch (err) {
    console.error('TEXT HANDLER ERROR:', err);
  }
});

bot.on('photo', async (ctx) => {
  try {
    await intake.handlePhoto(ctx);
  } catch (err) {
    console.error('PHOTO HANDLER ERROR:', err);
  }
});

bot.catch((err, ctx) => {
  console.error('BOT ERROR:', err);
});

app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => res.send('✅ GoldOps Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Бот запущен на порту ${PORT}`);
});