const { Telegraf } = require('telegraf');
const config = require('./config');

const menu = require('./menu');
const intake = require('./intake');

const bot = new Telegraf(config.BOT_TOKEN);

console.log('Бот инициализируется...');

bot.start((ctx) => menu.showLanguageMenu(ctx));

bot.hears('🇷🇺 Русский', (ctx) => menu.setRussian(ctx));
bot.hears('🇬🇧 English', (ctx) => menu.setEnglish(ctx));

bot.hears(['📥 Приём золота', '📥 Gold Intake'], (ctx) => intake.start(ctx));

bot.hears(['🔙 Назад', '🔙 Back'], (ctx) => menu.showMainMenu(ctx));

bot.on('text', (ctx) => intake.handleText(ctx));
bot.on('photo', (ctx) => intake.handlePhoto(ctx));

bot.launch()
  .then(() => {
    console.log('✅ Бот успешно подключён к Telegram!');
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения:', err.message);
  });

console.log('Ожидаем подключения к Telegram...');