const menu = {
  showLanguageMenu: async (ctx) => {
    await ctx.reply('🌍 Выберите язык / Choose language:', {
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

  handleLanguage: async (ctx) => {
    try {
      const text = ctx.message.text || '';
      const lang = text.includes('Русский') ? 'ru' : 'en';

      await ctx.reply(
        lang === 'ru'
          ? '✅ Язык установлен на Русский.'
          : '✅ Language set to English.'
      );

      setTimeout(async () => {
        try {
          await menu.showMainMenu(ctx, lang);
        } catch (err) {
          console.error('SHOW MAIN MENU ERROR:', err);
        }
      }, 800);
    } catch (err) {
      console.error('HANDLE LANGUAGE ERROR:', err);
    }
  },

  changeLanguage: async (ctx) => {
    try {
      await ctx.reply('🔄 Перезапуск бота...');
      setTimeout(async () => {
        try {
          await menu.showLanguageMenu(ctx);
        } catch (err) {
          console.error('SHOW LANGUAGE MENU ERROR:', err);
        }
      }, 600);
    } catch (err) {
      console.error('CHANGE LANGUAGE ERROR:', err);
    }
  },

  showMainMenu: async (ctx, lang = 'ru') => {
    if (lang === 'ru') {
      await ctx.reply('👋 Главное меню GoldOps:', {
        reply_markup: {
          keyboard: [
            ['📥 Приём золота'],
            ['📤 Отправка золота'],
            ['⛽ Заправка топлива'],
            ['📊 Директорский бриф'],
            ['🔄 Смена языка']
          ],
          resize_keyboard: true,
          is_persistent: true
        }
      });
    } else {
      await ctx.reply('👋 GoldOps Main Menu:', {
        reply_markup: {
          keyboard: [
            ['📥 Gold Intake'],
            ['📤 Send Gold'],
            ['⛽ Fuel Refill'],
            ['📊 Director Brief'],
            ['🔄 Change Language']
          ],
          resize_keyboard: true,
          is_persistent: true
        }
      });
    }
  }
};

module.exports = menu;