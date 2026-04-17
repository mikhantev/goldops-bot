const sites = require('./sites');

// Хранилище состояния
let userState = {};

// ==================== ЗАПУСК ====================
async function start(ctx) {
  const userId = ctx.from.id;
  const lang = ctx.session?.language || 'ru';

  // Получаем данные пользователя
  const userData = await getUserData(userId);
  const isDirector = userData.role === 'director';

  userState[userId] = {
    step: 'select_from_site',
    history: ['select_from_site'],
    language: lang,
    isDirector: isDirector,
    defaultSite: userData.defaultSite
  };

  const t = getTranslations(lang);

  if (!isDirector && userData.defaultSite) {
    // Для обычных сотрудников — автоматически подставляем Default Site
    userState[userId].fromSite = userData.defaultSite;
    await proceedToToSite(ctx, userId);
  } else {
    // Для директоров — полный выбор
    const miningSites = await sites.getMiningSites();
    const keyboard = miningSites.map(site => [{ text: site.code }]);
    keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

    ctx.reply(t.chooseFromSite, {
      reply_markup: { keyboard, resize_keyboard: true }
    });
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
async function getUserData(userId) {
  // Заглушка. Позже заменим на реальное чтение из 09_Bot_Users
  return {
    role: (userId.toString() === '123456789' || userId.toString() === '344577046') ? 'director' : 'operator',
    defaultSite: 'SITE-001'
  };
}

async function proceedToToSite(ctx, userId) {
  const state = userState[userId];
  const t = getTranslations(state.language);

  const warehouses = await sites.getWarehouses();
  const keyboard = warehouses.map(w => [{ text: w.code }]);
  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  ctx.reply(t.chooseToSite, {
    reply_markup: { keyboard, resize_keyboard: true }
  });

  state.step = 'select_to_site';
  state.history.push('select_to_site');
}

// ==================== ОБРАБОТКА ====================
async function handleText(ctx) {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState[userId];

  if (!state) {
    ctx.reply("Начните отправку заново через главное меню.");
    return;
  }

  const t = getTranslations(state.language);

  if (text === t.mainMenu) {
    delete userState[userId];
    require('./menu').showLanguageMenu(ctx);
    return;
  }

  if (text === t.back) {
    goBack(ctx, userId);
    return;
  }

  // Шаг 1: From Site (только для директоров)
  if (state.step === 'select_from_site') {
    const miningSites = await sites.getMiningSites();
    const site = miningSites.find(s => s.code === text);

    if (site) {
      state.fromSite = site.code;
      await proceedToToSite(ctx, userId);
    } else {
      ctx.reply(t.errorInvalidSite || "❌ Выберите участок из списка.");
    }
  }

  // Шаг 2: To Site
  else if (state.step === 'select_to_site') {
    const warehouses = await sites.getWarehouses();
    const warehouse = warehouses.find(w => w.code === text);

    if (warehouse) {
      state.toSite = warehouse.code;
      state.step = 'select_gold_type';
      state.history.push('select_gold_type');

      ctx.reply(t.chooseGoldType, {
        reply_markup: {
          keyboard: [
            [{ text: "Raw Gold" }, { text: "Concentrate" }],
            [{ text: "Dore" }],
            [{ text: t.back }, { text: t.mainMenu }]
          ],
          resize_keyboard: true
        }
      });
    } else {
      ctx.reply(t.errorInvalidWarehouse || "❌ Выберите склад из списка.");
    }
  }

  // Шаг 3: Тип золота
  else if (state.step === 'select_gold_type') {
    if (['Raw Gold', 'Concentrate', 'Dore'].includes(text)) {
      state.goldType = text;
      state.step = 'enter_weight';
      state.history.push('enter_weight');
      ctx.reply(t.enterWeight);
    } else {
      ctx.reply("❌ Выберите тип золота из списка.");
    }
  }

  // Шаг 4: Вес
  else if (state.step === 'enter_weight') {
    const weight = parseFloat(text);
    if (isNaN(weight) || weight <= 0 || weight > 100000) {
      ctx.reply(t.errorWeight);
      return;
    }
    state.weight = weight;
    state.step = 'enter_purity';
    state.history.push('enter_purity');
    ctx.reply(t.enterPurity);
  }

  // Шаг 5: Чистота
  else if (state.step === 'enter_purity') {
    const purity = parseFloat(text);
    if (isNaN(purity) || purity < 0 || purity > 100) {
      ctx.reply(t.errorPurity);
      return;
    }
    state.purity = purity;
    state.step = 'enter_comment';
    state.history.push('enter_comment');
    ctx.reply(t.enterComment);
  }

  // Шаг 6: Комментарий
  else if (state.step === 'enter_comment') {
    state.comment = (text.toLowerCase() === 'skip' || text === t.skipComment) ? '' : text;
    state.step = 'confirm';
    state.history.push('confirm');
    showConfirmation(ctx, state);
  }

  // Шаг 7: Подтверждение
  else if (state.step === 'confirm') {
    if (text === t.confirmBtn) {
      ctx.reply("📸 Пришлите фото отправки золота (обязательно)");
      state.step = 'send_photo';
    } else if (text === t.cancelBtn) {
      ctx.reply(t.operationCancelled);
      delete userState[userId];
      require('./menu').showLanguageMenu(ctx);
    }
  }
}

// ==================== ПОДТВЕРЖДЕНИЕ ====================
function showConfirmation(ctx, state) {
  const t = getTranslations(state.language);

  const message = t.confirmationHeader +
    `From: ${state.fromSite}\n` +
    `To: ${state.toSite}\n` +
    `Type: ${state.goldType}\n` +
    `Weight: ${state.weight} g\n` +
    `Purity: ${state.purity}%\n` +
    (state.comment ? `Comment: ${state.comment}\n` : '') +
    `\n${t.confirmQuestion}`;

  ctx.reply(message, {
    reply_markup: {
      keyboard: [
        [{ text: t.confirmBtn }],
        [{ text: t.cancelBtn }],
        [{ text: t.back }],
        [{ text: t.mainMenu }]
      ],
      resize_keyboard: true
    }
  });
}

// ==================== ФОТО ====================
function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (state && state.step === 'send_photo') {
    const t = getTranslations(state.language);

    ctx.reply(t.successMessage +
      `From: ${state.fromSite}\n` +
      `To: ${state.toSite}\n` +
      `Type: ${state.goldType}\n` +
      `Weight: ${state.weight} g\n` +
      `Purity: ${state.purity}%\n` +
      `\n📸 Photo received. Транзакция создана.`);

    setTimeout(() => {
      delete userState[userId];
      require('./menu').showLanguageMenu(ctx);
    }, 1500);
  }
}

// ==================== НАЗАД ====================
function goBack(ctx, userId) {
  const state = userState[userId];
  if (!state || state.history.length <= 1) {
    delete userState[userId];
    require('./menu').showLanguageMenu(ctx);
    return;
  }

  state.history.pop();
  state.step = state.history[state.history.length - 1];

  const t = getTranslations(state.language);

  if (state.step === 'select_from_site') start(ctx);
  else if (state.step === 'select_to_site') proceedToToSite(ctx, userId); // можно вынести
  else if (state.step === 'select_gold_type') {
    ctx.reply(t.chooseGoldType, { /* клавиатура */ });
  } else if (state.step === 'enter_weight') ctx.reply(t.enterWeight);
  else if (state.step === 'enter_purity') ctx.reply(t.enterPurity);
  else if (state.step === 'enter_comment') ctx.reply(t.enterComment);
}

// ==================== ПЕРЕВОДЫ ====================
function getTranslations(lang) {
  const tr = {
    ru: {
      chooseFromSite: '📍 Откуда отправляем (добыча):',
      chooseToSite: '📍 Куда отправляем (склад):',
      chooseGoldType: '🔸 Выберите тип золота:',
      enterWeight: '⚖️ Введите вес в граммах (только число):',
      enterPurity: '💎 Введите чистоту (%) (например: 92.5):',
      enterComment: '💬 Введите комментарий или "Пропустить":',
      confirmationHeader: 'Проверьте данные перед отправкой:\n\n',
      confirmQuestion: 'Всё верно?',
      successMessage: '✅ Отправка золота успешно создана!\n\n',
      operationCancelled: '❌ Отправка отменена.',
      back: '🔙 Назад',
      mainMenu: '🏠 Главное меню',
      errorInvalidSite: '❌ Выберите участок из списка.',
      errorInvalidWarehouse: '❌ Выберите склад из списка.',
      errorWeight: '❌ Вес должен быть больше 0 и меньше 100000 г',
      errorPurity: '❌ Чистота должна быть от 0 до 100%',
      confirmBtn: '✅ Подтвердить',
      cancelBtn: '❌ Отменить',
      skipComment: 'Пропустить'
    },
    en: {
      chooseFromSite: '📍 From Site (Mining):',
      chooseToSite: '📍 To Site (Warehouse):',
      chooseGoldType: '🔸 Select Gold Type:',
      enterWeight: '⚖️ Enter weight in grams (number only):',
      enterPurity: '💎 Enter purity (%) (e.g. 92.5):',
      enterComment: '💬 Enter comment or type "Skip":',
      confirmationHeader: 'Please verify the data before sending:\n\n',
      confirmQuestion: 'Is everything correct?',
      successMessage: '✅ Gold shipment successfully created!\n\n',
      operationCancelled: '❌ Shipment cancelled.',
      back: '🔙 Back',
      mainMenu: '🏠 Main Menu',
      errorInvalidSite: '❌ Please select a site from the list.',
      errorInvalidWarehouse: '❌ Please select a warehouse from the list.',
      errorWeight: '❌ Weight must be between 0 and 100000 g',
      errorPurity: '❌ Purity must be between 0 and 100%',
      confirmBtn: '✅ Confirm',
      cancelBtn: '❌ Cancel',
      skipComment: 'Skip'
    }
  };
  return tr[lang] || tr.ru;
}

module.exports = {
  start,
  handleText,
  handlePhoto
};