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

    setTimeout(() => showMainMenu(ctx, lang), 800);
  },

  // Кнопка "Смена языка" — полный перезапуск выбора языка
  changeLanguage: (ctx) => {
    showLanguageMenu(ctx);
  },

  showMainMenu: (ctx, lang = 'ru') => {
    if (lang === 'ru') {
      ctx.reply('👋 Главное меню GoldOps:', {
        reply_markup: {
          keyboard: [
            ['📥 Приём золота'],
            ['📤 Отправка золота'],
            ['⛽ Заправка топлива'],
            ['📊 Директорский бриф'],
            ['🔄 Смена языка']
          ],
          resize_keyboard: true,
          persistent: true
        }
      });
    } else {
      ctx.reply('👋 GoldOps Main Menu:', {
        reply_markup: {
          keyboard: [
            ['📥 Gold Intake'],
            ['📤 Send Gold'],
            ['⛽ Fuel Refill'],
            ['📊 Director Brief'],
            ['🔄 Change Language']
          ],
          resize_keyboard: true,
          persistent: true
        }
      });
    }
  }
};

module.exports = menu;