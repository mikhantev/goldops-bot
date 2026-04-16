const { Telegraf } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

console.log('🚀 GoldOps Webhook Bot starting...');

bot.start((ctx) => ctx.reply('✅ Бот GoldOps запущен!\nНапишите /menu'));

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n📥 Приём золота\n📤 Отправка золота');
});

// Это самый важный блок для Railway
const webhookHandler = bot.webhookCallback('/webhook');

module.exports = (req, res) => {
  if (req.method === 'POST') {
    webhookHandler(req, res);
  } else {
    res.status(200).send('OK');
  }
};

console.log('✅ Webhook handler готов');
console.log('Публичный URL: ' + (process.env.RAILWAY_PUBLIC_DOMAIN || 'unknown'));