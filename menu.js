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

    // Простой рабочий вызов меню (как было раньше)
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
  }
};

module.exports = menu;