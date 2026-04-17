const express = require('express');
const { Telegraf } = require('telegraf');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);

const menu = require('./menu');
const intake = require('./intake');
const send = require('./send');

console.log('Бот инициализируется...');

/**
 * @typedef {'ru' | 'en'} Language
 */

// ==================== КОМАНДЫ И КНОПКИ ====================
bot.start(async (ctx) => {
  try {
    await menu.showLanguageMenu(ctx);
  } catch (err) {
    console.error('START ERROR:', err);
    await ctx.reply('❌ Ошибка запуска бота / Bot start error');
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
    await ctx.reply('Ошибка смены языка / Language change error');
  }
});

// Приём золота
bot.hears(['📥 Приём золота', '📥 Gold Intake'], async (ctx) => {
  try {
    console.log('🟡 INTAKE BUTTON TRIGGERED');
    await intake.start(ctx);
  } catch (err) {
    console.error('INTAKE START ERROR:', err);
  }
});

// Отправка золота
bot.hears(['📤 Отправка золота', '📤 Send Gold'], async (ctx) => {
  try {
    console.log('🟢 BUTTON SEND TRIGGERED');
    await send.start(ctx);
  } catch (err) {
    console.error('SEND START ERROR:', err);
    await ctx.reply('❌ Ошибка запуска отправки золота / Error starting send gold');
  }
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  console.log('TEXT RECEIVED =', text);

  // Игнорируем кнопки, которые уже обработаны выше
  const ignoredButtons = [
    '🇷🇺 Русский', '🇬🇧 English',
    '🔄 Смена языка', '🔄 Change Language',
    '📥 Приём золота', '📥 Gold Intake',
    '📤 Отправка золота', '📤 Send Gold'
  ];

  if (ignoredButtons.includes(text)) {
    return;
  }

  try {
    // Сначала пытаемся обработать в Send Gold (более приоритетный сейчас)
    await send.handleText(ctx);
    return;
  } catch (err) {
    console.error('SEND TEXT HANDLER ERROR:', err);
  }

  try {
    // Если не сработало — пробуем Intake
    await intake.handleText(ctx);
  } catch (err) {
    console.error('INTAKE TEXT HANDLER ERROR:', err);
  }
});

bot.on('photo', async (ctx) => {
  console.log('PHOTO RECEIVED');

  try {
    await send.handlePhoto(ctx);
    return;
  } catch (err) {
    console.error('SEND PHOTO HANDLER ERROR:', err);
  }

  try {
    await intake.handlePhoto(ctx);
  } catch (err) {
    console.error('INTAKE PHOTO HANDLER ERROR:', err);
  }
});

bot.on('location', async (ctx) => {
  console.log('LOCATION RECEIVED');
  try {
    await send.handleLocation(ctx);
  } catch (err) {
    console.error('LOCATION HANDLER ERROR:', err);
    await ctx.reply('❌ Ошибка обработки геолокации / Location processing error');
  }
});

// Глобальный обработчик ошибок
bot.catch((err, ctx) => {
  console.error('GLOBAL BOT ERROR:', err);
  try {
    ctx.reply('❌ Произошла ошибка. Попробуйте ещё раз / An error occurred. Please try again.');
  } catch (e) {
    console.error('ERROR WHILE SENDING ERROR MESSAGE:', e);
  }
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => res.send('✅ GoldOps Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Бот запущен на порту ${PORT}`);
});