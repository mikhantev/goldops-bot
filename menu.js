let userLanguage = {};   // глобальное хранилище языка пользователя

function showLanguageMenu(ctx) {
  ctx.reply('Добро пожаловать в GoldOps!', {
    reply_markup: {
      keyboard: [
        [{ text: "🇷🇺 Русский" }],
        [{ text: "🇬🇧 English" }]
      ],
      resize_keyboard: true
    }
  });
}

function setRussian(ctx) {
  const userId = ctx.from.id;
  userLanguage[userId] = 'ru';

  ctx.reply('✅ Язык установлен на Русский', {
    reply_markup: {
      keyboard: [
        [{ text: "📥 Приём золота" }, { text: "📤 Отправка золота" }],
        [{ text: "⛽ Заправка топлива" }, { text: "📋 Лог производства" }],
        [{ text: "🛠 Техника" }, { text: "💰 Расходы" }],
        [{ text: "📊 Директорский бриф" }, { text: "🔙 Назад" }]
      ],
      resize_keyboard: true
    }
  });
}

function setEnglish(ctx) {
  const userId = ctx.from.id;
  userLanguage[userId] = 'en';

  ctx.reply('✅ Language set to English', {
    reply_markup: {
      keyboard: [
        [{ text: "📥 Gold Intake" }, { text: "📤 Send Gold" }],
        [{ text: "⛽ Fuel Log" }, { text: "📋 Production Log" }],
        [{ text: "🛠 Equipment" }, { text: "💰 Expenses" }],
        [{ text: "📊 Director Brief" }, { text: "🔙 Back" }]
      ],
      resize_keyboard: true
    }
  });
}

function showMainMenu(ctx) {
  const userId = ctx.from.id;
  const lang = userLanguage[userId] || 'ru';
  const isEnglish = lang === 'en';

  ctx.reply(isEnglish ? 'Main Menu:' : 'Главное меню:', {
    reply_markup: {
      keyboard: [
        [{ text: isEnglish ? "📥 Gold Intake" : "📥 Приём золота" }, 
         { text: isEnglish ? "📤 Send Gold" : "📤 Отправка золота" }],
        [{ text: isEnglish ? "⛽ Fuel Log" : "⛽ Заправка топлива" }, 
         { text: isEnglish ? "📋 Production Log" : "📋 Лог производства" }],
        [{ text: isEnglish ? "🛠 Equipment" : "🛠 Техника" }, 
         { text: isEnglish ? "💰 Expenses" : "💰 Расходы" }],
        [{ text: isEnglish ? "📊 Director Brief" : "📊 Директорский бриф" }, 
         { text: isEnglish ? "🔙 Back" : "🔙 Назад" }]
      ],
      resize_keyboard: true
    }
  });
}

module.exports = {
  showLanguageMenu,
  setRussian,
  setEnglish,
  showMainMenu
};