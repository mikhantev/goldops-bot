const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

console.log('Webhook бот GoldOps инициализирован');

bot.start((ctx) => {
  ctx.reply('✅ Бот GoldOps работает через webhook!\n\nНапишите /menu');
});

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n📥 Приём золота\n📤 Отправка золота');
});

// Экспорт для webhook (важно для Railway)
module.exports = bot.webhookCallback('/webhook');

console.log('Готов к приёму webhook запросов');