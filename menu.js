/**
 * @typedef {'ru' | 'en'} Language
 */

/**
 * @typedef {Object} MenuTranslations
 * @property {string} mainMenuTitle
 * @property {string} intakeButton
 * @property {string} sendButton
 * @property {string} fuelButton
 * @property {string} directorBriefButton
 * @property {string} changeLanguageButton
 * @property {string} languageSelection
 * @property {string} languageSetRu
 * @property {string} languageSetEn
 * @property {string} restartMessage
 */

/** @type {Object.<Language, MenuTranslations>} */
const translations = {
  ru: {
    mainMenuTitle: '👋 Главное меню GoldOps:',
    intakeButton: '📥 Приём золота',
    sendButton: '📤 Отправка золота',
    fuelButton: '⛽ Заправка топлива',
    directorBriefButton: '📊 Директорский бриф',
    changeLanguageButton: '🔄 Смена языка',
    languageSelection: '🌍 Выберите язык / Choose language:',
    languageSetRu: '✅ Язык установлен на Русский.',
    languageSetEn: '✅ Language set to English.',
    restartMessage: '🔄 Перезапуск бота...'
  },
  en: {
    mainMenuTitle: '👋 GoldOps Main Menu:',
    intakeButton: '📥 Gold Intake',
    sendButton: '📤 Send Gold',
    fuelButton: '⛽ Fuel Refill',
    directorBriefButton: '📊 Director Brief',
    changeLanguageButton: '🔄 Change Language',
    languageSelection: '🌍 Choose language / Выберите язык:',
    languageSetRu: '✅ Язык установлен на Русский.',
    languageSetEn: '✅ Language set to English.',
    restartMessage: '🔄 Restarting bot...'
  }
};

/** @param {Language} lang */
function getTranslations(lang) {
  return translations[lang] || translations.ru;
}

/**
 * Показать меню выбора языка
 * @param {import('telegraf').Context} ctx 
 */
async function showLanguageMenu(ctx) {
  try {
    await ctx.reply(getTranslations('ru').languageSelection, {
      reply_markup: {
        keyboard: [
          ['🇷🇺 Русский'],
          ['🇬🇧 English']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } catch (err) {
    console.error('❌ showLanguageMenu ERROR:', err);
  }
}

/**
 * Обработка выбора языка + сохранение для send.js
 * @param {import('telegraf').Context} ctx 
 */
async function handleLanguage(ctx) {
  try {
    const text = ctx.message.text || '';
    const lang = text.includes('Русский') ? 'ru' : 'en';

    const userId = ctx.from.id;

    // ←←← КЛЮЧЕВАЯ СТРОКА: сохраняем язык глобально
    if (global.userLanguage) {
      global.userLanguage[userId] = lang;
    }

    const t = getTranslations(lang);

    await ctx.reply(lang === 'ru' ? t.languageSetRu : t.languageSetEn);

    // Показываем главное меню на выбранном языке
    setTimeout(async () => {
      await showMainMenu(ctx, lang);
    }, 800);

  } catch (err) {
    console.error('❌ handleLanguage ERROR:', err);
    await ctx.reply('Ошибка выбора языка / Language selection error');
  }
}

/**
 * Полный перезапуск с выбором языка
 * @param {import('telegraf').Context} ctx 
 */
async function changeLanguage(ctx) {
  try {
    await ctx.reply('🔄 Перезапуск бота...');

    setTimeout(async () => {
      await showLanguageMenu(ctx);
    }, 700);
  } catch (err) {
    console.error('❌ changeLanguage ERROR:', err);
  }
}

/**
 * Показать главное меню
 * @param {import('telegraf').Context} ctx 
 * @param {Language} lang 
 */
async function showMainMenu(ctx, lang = 'ru') {
  try {
    const t = getTranslations(lang);

    await ctx.reply(t.mainMenuTitle, {
      reply_markup: {
        keyboard: [
          [t.intakeButton],
          [t.sendButton],
          [t.fuelButton],
          [t.directorBriefButton],
          [t.changeLanguageButton]
        ],
        resize_keyboard: true,
        persistent: true
      }
    });
  } catch (err) {
    console.error('❌ showMainMenu ERROR:', err);
  }
}

module.exports = {
  showLanguageMenu,
  handleLanguage,
  changeLanguage,
  showMainMenu
};