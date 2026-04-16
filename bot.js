const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Бот работает через webhook!\nНапишите /menu');
});

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n1. Приём золота\n2. Отправка золота');
});

console.log('Бот инициализируется...');

// Для webhook на Railway
const webhookPath = `/webhook/${config.BOT_TOKEN.split(':')[1]}`;

bot.launch({
  webhook: {
    domain: process.env.RAILWAY_PUBLIC_DOMAIN || 'your-domain.up.railway.app',
    path: webhookPath,
    port: process.env.PORT || 3000
  }
})
  .then(() => console.log('✅ Webhook бот запущен'))
  .catch(err => console.error('Ошибка:', err.message));

console.log('Ожидаем webhook...');