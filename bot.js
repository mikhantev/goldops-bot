const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Бот запущен!\nНапишите /start для теста');
});

bot.launch()
  .then(() => console.log('✅ Бот запущен'))
  .catch(err => console.error('Ошибка:', err.message));

console.log('Запуск бота...');