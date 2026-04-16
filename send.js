let userState = {};

// ==================== ЗАПУСК ОТПРАВКИ ЗОЛОТА ====================
function start(ctx) {
  const userId = ctx.from.id;
  
  let language = 'ru';
  if (ctx.message.text === '📤 Send Gold') {
    language = 'en';
  } else if (userState[userId]) {
    language = userState[userId].language || 'ru';
  }

  userState[userId] = { 
    step: 'select_site_from',
    history: ['select_site_from'],
    language: language
  };

  const t = getTranslations(language);

  ctx.reply(t.chooseSiteFrom, {
    reply_markup: {
      keyboard: [
        [{ text: "SITE-001" }, { text: "SITE-002" }],
        [{ text: "SITE-003" }],
        [{ text: t.back }]
      ],
      resize_keyboard: true
    }
  });
}

// ==================== ПЕРЕВОДЫ ====================
function getTranslations(lang) {
  const translations = {
    ru: {
      chooseSiteFrom: '📍 Выберите участок, откуда отправляем золото (Site):',
      back: '🔙 Назад',
      errorNumber: '❌ Пожалуйста, введите только число'
    },
    en: {
      chooseSiteFrom: '📍 Select site to send gold from (Site):',
      back: '🔙 Back',
      errorNumber: '❌ Please enter only a number'
    }
  };
  return translations[lang] || translations.ru;
}

function handleText(ctx) {
  ctx.reply('Отправка золота в разработке...');
}

module.exports = {
  start,
  handleText
};