const { Telegraf } = require('telegraf');
const config = require('./config');

console.log('Бот запускается...');
console.log('BOT_TOKEN length:', config.BOT_TOKEN ? config.BOT_TOKEN.length : 'NOT FOUND');

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Бот работает!\nНапишите /menu');
});

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n1. Приём золота\n2. Отправка золота');
});

bot.launch()
  .then(() => console.log('✅ Бот успешно подключён к Telegram'))
  .catch(err => console.error('❌ Ошибка подключения:', err.message));

console.log('Ожидаем подключения к Telegram...');