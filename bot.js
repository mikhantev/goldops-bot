const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

console.log('Бот инициализируется...');
console.log('BOT_TOKEN length:', config.BOT_TOKEN.length);

bot.start((ctx) => {
  ctx.reply('Бот работает!\nНапишите /menu для меню');
});

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n1. Приём золота\n2. Отправка золота');
});

bot.launch()
  .then(() => console.log('✅ Бот запущен успешно'))
  .catch(err => console.error('Ошибка:', err.message));

console.log('Ожидаем подключения...');