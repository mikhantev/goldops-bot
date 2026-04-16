const { Telegraf } = require('telegraf');
const config = require('./config');

console.log('Бот запускается...');
console.log('BOT_TOKEN length:', config.BOT_TOKEN.length);

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Бот работает! Тестовое сообщение.'));

console.log('Запускаем bot.launch()...');

bot.launch()
  .then(() => console.log('✅ Успешно подключён!'))
  .catch((err) => {
    console.error('❌ Ошибка:', err.message);
    console.log('Бот упал. Проверь токен и интернет.');
  });

console.log('Ожидаем подключения...');