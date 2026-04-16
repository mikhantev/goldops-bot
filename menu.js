// menu.js — Полное главное меню

const menu = {

  showLanguageMenu: (ctx) => {
    ctx.reply('🌍 Выберите язык / Choose language:', {
      reply_markup: {
        keyboard: [
          ['🇷🇺 Русский'],
          ['🇬🇧 English']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  },

  handleLanguage: (ctx) => {
    const text = ctx.message.text || '';
    const lang = text.includes('Русский') ? 'ru' : 'en';

    ctx.reply(lang === 'ru' 
      ? '✅ Язык установлен на Русский.' 
      : '✅ Language set to English.');

    setTimeout(() => showMainMenu(ctx, lang), 1000);
  }
};

function showMainMenu(ctx, lang = 'ru') {
  const isRussian = lang === 'ru';

  const text = isRussian 
    ? '👋 Главное меню GoldOps:' 
    : '👋 GoldOps Main Menu:';

  ctx.reply(text, {
    reply_markup: {
      keyboard: [
        ['📥 Приём золота', '📥 Gold Intake'],
        ['📤 Отправка золота', '📤 Send Gold'],
        ['⛽ Заправка топлива', '⛽ Fuel Refill'],
        ['📊 Директорский бриф', '📊 Director Brief'],
        ['🔄 Смена языка', '🔄 Change Language']
      ],
      resize_keyboard: true,
      persistent: true
    }
  });
}

module.exports = menu;