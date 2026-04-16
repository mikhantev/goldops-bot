const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => ctx.reply('✅ Бот GoldOps запущен!\nНапишите /menu для меню'));

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n1. 📥 Приём золота\n2. 📤 Отправка золота');
});

console.log('✅ Webhook бот инициализирован');

if (process.env.NODE_ENV === 'production') {
  // Для Railway webhook
  module.exports = bot.webhookCallback('/webhook');
} else {
  bot.launch().then(() => console.log('Local bot launched'));
}