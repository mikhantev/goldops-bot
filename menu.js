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

    setTimeout(() => {
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
    }, 800);
  },

  // Делаем точно так же, как кнопка "Главное меню" в intake
  changeLanguage: (ctx) => {
    // Полный сброс и перезапуск с выбора языка
    ctx.reply('🔄 Перезапуск бота...');
    setTimeout(() => {
      menu.showLanguageMenu(ctx);
    }, 600);
  }
};

module.exports = menu;