const express = require('express');
const { Telegraf } = require('telegraf');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);

console.log('🚀 GoldOps Bot starting with Express + Webhook...');

// Команды
bot.start((ctx) => ctx.reply('✅ Бот GoldOps работает!\n\nНапишите /menu'));

bot.command('menu', (ctx) => {
  ctx.reply('Главное меню:\n📥 Приём золота\n📤 Отправка золота');
});

// Webhook маршрут
app.use(bot.webhookCallback('/webhook'));

// Health check
app.get('/', (req, res) => res.send('Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Webhook URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-domain'}.up.railway.app/webhook`);
});