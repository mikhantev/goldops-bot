const menu = {
  showLanguageMenu: (ctx) => {
    ctx.reply('Выберите язык / Choose language:', {
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
    const text = ctx.message.text;
    const lang = text.includes('Русский') ? 'ru' : 'en';

    // Здесь можно сохранить язык пользователя, пока просто выводим
    ctx.reply(lang === 'ru' ? '✅ Язык установлен: Русский' : '✅ Language set: English');

    setTimeout(() => {
      showMainMenu(ctx, lang);
    }, 800);
  }
};

function showMainMenu(ctx, lang = 'ru') {
  const keyboard = {
    reply_markup: {
      keyboard: [
        ['📥 Приём золота', '📥 Gold Intake'],
        ['📤 Отправка золота', '📤 Send Gold']
      ],
      resize_keyboard: true
    }
  };

  const text = lang === 'ru' 
    ? '👋 Главное меню:' 
    : '👋 Main Menu:';

  ctx.reply(text, keyboard);
}

module.exports = menu;