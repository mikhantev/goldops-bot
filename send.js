const sites = require('./sites');

let userState = {};

// ==================== ЗАПУСК ====================
async function start(ctx) {
  const userId = ctx.from.id;
  const lang = ctx.session?.language || ctx.session?.lang || 'ru';

  const userData = await getUserData(userId);
  const isDirector = userData.role === 'director';

  userState[userId] = {
    step: 'select_from_site',
    history: ['select_from_site'],
    language: lang,
    isDirector,
    defaultSite: userData.defaultSite,
    defaultSiteName: userData.defaultSiteName || userData.defaultSite || ''
  };

  const t = getTranslations(lang);

  // Для обычных сотрудников автоматически ставим default site
  if (!isDirector && userData.defaultSite) {
    userState[userId].fromSite = userData.defaultSite;
    userState[userId].fromSiteName =
      userData.defaultSiteName || userData.defaultSite;

    await proceedToToSite(ctx, userId);
    return;
  }

  const miningSites = await sites.getMiningSites();
  console.log('SEND > miningSites =', JSON.stringify(miningSites, null, 2));

  if (!miningSites || miningSites.length === 0) {
    await ctx.reply('❌ Участки не загрузились из таблицы');
    return;
  }

  const keyboard = miningSites.map(site => [
    { text: formatButton(site) }
  ]);

  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  await ctx.reply(t.chooseFromSite, {
    reply_markup: {
      keyboard,
      resize_keyboard: true
    }
  });
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
async function getUserData(userId) {
  // Пока заглушка
  const isDirector =
    userId.toString() === '123456789' || userId.toString() === '344577046';

  return {
    role: isDirector ? 'director' : 'operator',
    defaultSite: 'SITE-001',
    defaultSiteName: 'Site 1'
  };
}

function formatButton(item) {
  if (!item) return '';
  if (item.name && item.code) return `${item.name} (${item.code})`;
  return item.name || item.code || '';
}

function findByText(list, text) {
  return list.find(item => {
    const formatted = formatButton(item);
    return (
      text === item.code ||
      text === item.name ||
      text === formatted
    );
  });
}

async function proceedToToSite(ctx, userId) {
  const state = userState[userId];
  const t = getTranslations(state.language);

  const warehouses = await sites.getWarehouses();
  console.log('SEND > warehouses =', JSON.stringify(warehouses, null, 2));

  if (!warehouses || warehouses.length === 0) {
    await ctx.reply('❌ Склады не загрузились из таблицы');
    return;
  }

  const keyboard = warehouses.map(w => [
    { text: formatButton(w) }
  ]);

  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  await ctx.reply(t.chooseToSite, {
    reply_markup: {
      keyboard,
      resize_keyboard: true
    }
  });

  state.step = 'select_to_site';

  if (state.history[state.history.length - 1] !== 'select_to_site') {
    state.history.push('select_to_site');
  }
}

function getGoldTypeKeyboard(t) {
  return {
    reply_markup: {
      keyboard: [
        ['Raw Gold', 'Concentrate'],
        ['Dore'],
        [t.back, t.mainMenu]
      ],
      resize_keyboard: true
    }
  };
}

// ==================== ОБРАБОТКА ====================
async function handleText(ctx) {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState[userId];

  if (!state) {
    await ctx.reply('Начните заново через меню.');
    return;
  }

  const t = getTranslations(state.language);

  if (text === t.mainMenu) {
    const lang = state.language || 'ru';
    delete userState[userId];
    return require('./menu').showMainMenu(ctx, lang);
  }

  if (text === t.back) {
    return goBack(ctx, userId);
  }

  // ===== FROM SITE =====
  if (state.step === 'select_from_site') {
    const miningSites = await sites.getMiningSites();
    const site = findByText(miningSites, text);

    if (!site) {
      return ctx.reply(t.errorInvalidSite);
    }

    state.fromSite = site.code;
    state.fromSiteName = site.name || site.code;

    return proceedToToSite(ctx, userId);
  }

  // ===== TO SITE =====
  if (state.step === 'select_to_site') {
    const warehouses = await sites.getWarehouses();
    const wh = findByText(warehouses, text);

    if (!wh) {
      return ctx.reply(t.errorInvalidWarehouse);
    }

    state.toSite = wh.code;
    state.toSiteName = wh.name || wh.code;

    state.step = 'select_gold_type';
    if (state.history[state.history.length - 1] !== 'select_gold_type') {
      state.history.push('select_gold_type');
    }

    return ctx.reply(t.chooseGoldType, getGoldTypeKeyboard(t));
  }

  // ===== GOLD TYPE =====
  if (state.step === 'select_gold_type') {
    if (!['Raw Gold', 'Concentrate', 'Dore'].includes(text)) {
      return ctx.reply(t.errorInvalidGoldType);
    }

    state.goldType = text;
    state.step = 'enter_weight';

    if (state.history[state.history.length - 1] !== 'enter_weight') {
      state.history.push('enter_weight');
    }

    return ctx.reply(t.enterWeight);
  }

  // ===== WEIGHT =====
  if (state.step === 'enter_weight') {
    const weight = parseFloat(text.replace(',', '.'));

    if (isNaN(weight) || weight <= 0 || weight > 100000) {
      return ctx.reply(t.errorWeight);
    }

    state.weight = weight;
    state.step = 'enter_purity';

    if (state.history[state.history.length - 1] !== 'enter_purity') {
      state.history.push('enter_purity');
    }

    return ctx.reply(t.enterPurity);
  }

  // ===== PURITY =====
  if (state.step === 'enter_purity') {
    const purity = parseFloat(text.replace(',', '.'));

    if (isNaN(purity) || purity < 0 || purity > 100) {
      return ctx.reply(t.errorPurity);
    }

    state.purity = purity;
    state.step = 'enter_comment';

    if (state.history[state.history.length - 1] !== 'enter_comment') {
      state.history.push('enter_comment');
    }

    return ctx.reply(t.enterComment);
  }

  // ===== COMMENT =====
  if (state.step === 'enter_comment') {
    state.comment =
      text.toLowerCase() === 'skip' || text === t.skipComment ? '' : text;

    state.step = 'confirm';

    if (state.history[state.history.length - 1] !== 'confirm') {
      state.history.push('confirm');
    }

    return showConfirmation(ctx, state);
  }

  // ===== CONFIRM =====
  if (state.step === 'confirm') {
    if (text === t.confirmBtn) {
      state.step = 'send_photo';

      if (state.history[state.history.length - 1] !== 'send_photo') {
        state.history.push('send_photo');
      }

      return ctx.reply(t.sendPhotoRequired);
    }

    if (text === t.cancelBtn) {
      const lang = state.language || 'ru';
      delete userState[userId];
      await ctx.reply(t.operationCancelled);
      return require('./menu').showMainMenu(ctx, lang);
    }

    return ctx.reply(t.confirmChooseAction);
  }

  // ===== WAITING PHOTO =====
  if (state.step === 'send_photo') {
    return ctx.reply(t.waitingPhoto);
  }
}

// ==================== ПОДТВЕРЖДЕНИЕ ====================
async function showConfirmation(ctx, s) {
  const t = getTranslations(s.language);

  const message =
    `${t.confirmationHeader}\n\n` +
    `${t.labelFrom}: ${s.fromSiteName}\n` +
    `${t.labelTo}: ${s.toSiteName}\n` +
    `${t.labelType}: ${s.goldType}\n` +
    `${t.labelWeight}: ${s.weight} g\n` +
    `${t.labelPurity}: ${s.purity}%\n` +
    (s.comment ? `${t.labelComment}: ${s.comment}\n` : '') +
    `\n${t.confirmQuestion}`;

  return ctx.reply(message, {
    reply_markup: {
      keyboard: [
        [t.confirmBtn],
        [t.cancelBtn],
        [t.back, t.mainMenu]
      ],
      resize_keyboard: true
    }
  });
}

// ==================== ФОТО + ЗАПИСЬ ====================
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (!state || state.step !== 'send_photo') {
    return;
  }

  const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
  if (!photo) {
    return ctx.reply('❌ Фото не получено');
  }

  const fileId = photo.file_id;
  const shipmentId = `SHP-${Date.now()}`;

  const saved = await sites.addGoldShipment({
    shipmentId,
    createdAt: new Date().toISOString(),
    userId,
    fromSiteId: state.fromSite,
    fromSiteName: state.fromSiteName,
    toWarehouseId: state.toSite,
    toWarehouseName: state.toSiteName,
    goldType: state.goldType,
    weight: state.weight,
    purity: state.purity,
    comment: state.comment,
    photoFileId: fileId,
    status: 'CREATED'
  });

  if (!saved) {
    await ctx.reply('❌ Не удалось записать отправку в таблицу');
    return;
  }

  await ctx.reply(
    `${state.language === 'ru' ? '✅ Отправка сохранена' : '✅ Shipment saved'}\nID: ${shipmentId}`
  );

  const lang = state.language || 'ru';
  delete userState[userId];

  return require('./menu').showMainMenu(ctx, lang);
}

// ==================== НАЗАД ====================
async function goBack(ctx, userId) {
  const state = userState[userId];

  if (!state || state.history.length <= 1) {
    delete userState[userId];
    return require('./menu').showMainMenu(ctx, 'ru');
  }

  state.history.pop();
  state.step = state.history[state.history.length - 1];

  const t = getTranslations(state.language);

  if (state.step === 'select_from_site') {
    return start(ctx);
  }

  if (state.step === 'select_to_site') {
    return proceedToToSite(ctx, userId);
  }

  if (state.step === 'select_gold_type') {
    return ctx.reply(t.chooseGoldType, getGoldTypeKeyboard(t));
  }

  if (state.step === 'enter_weight') {
    return ctx.reply(t.enterWeight);
  }

  if (state.step === 'enter_purity') {
    return ctx.reply(t.enterPurity);
  }

  if (state.step === 'enter_comment') {
    return ctx.reply(t.enterComment);
  }

  if (state.step === 'confirm') {
    return showConfirmation(ctx, state);
  }
}

// ==================== ПЕРЕВОДЫ ====================
function getTranslations(lang) {
  const tr = {
    ru: {
      chooseFromSite: '📍 Откуда отправляем:',
      chooseToSite: '📍 Куда отправляем:',
      chooseGoldType: '🔸 Выберите тип золота:',
      enterWeight: '⚖️ Введите вес в граммах:',
      enterPurity: '💎 Введите чистоту (%):',
      enterComment: '💬 Введите комментарий или "Пропустить":',
      confirmationHeader: '📦 Подтверждение',
      confirmQuestion: 'Подтвердить?',
      operationCancelled: '❌ Отправка отменена.',
      errorInvalidSite: '❌ Выберите участок из списка.',
      errorInvalidWarehouse: '❌ Выберите склад из списка.',
      errorInvalidGoldType: '❌ Выберите тип золота из списка.',
      errorWeight: '❌ Вес должен быть больше 0 и меньше 100000',
      errorPurity: '❌ Чистота должна быть от 0 до 100',
      confirmBtn: '✅ Подтвердить',
      cancelBtn: '❌ Отменить',
      back: '🔙 Назад',
      mainMenu: '🏠 Главное меню',
      skipComment: 'Пропустить',
      sendPhotoRequired: '📸 Пришлите фото отправки золота',
      waitingPhoto: '📸 Пожалуйста, пришлите фото',
      confirmChooseAction: '❌ Выберите: Подтвердить, Отменить, Назад или Главное меню.',
      labelFrom: 'Откуда',
      labelTo: 'Куда',
      labelType: 'Тип',
      labelWeight: 'Вес',
      labelPurity: 'Чистота',
      labelComment: 'Комментарий'
    },
    en: {
      chooseFromSite: '📍 From site:',
      chooseToSite: '📍 To warehouse:',
      chooseGoldType: '🔸 Select gold type:',
      enterWeight: '⚖️ Enter weight in grams:',
      enterPurity: '💎 Enter purity (%):',
      enterComment: '💬 Enter comment or "Skip":',
      confirmationHeader: '📦 Confirmation',
      confirmQuestion: 'Confirm?',
      operationCancelled: '❌ Shipment cancelled.',
      errorInvalidSite: '❌ Select a site from the list.',
      errorInvalidWarehouse: '❌ Select a warehouse from the list.',
      errorInvalidGoldType: '❌ Select a gold type from the list.',
      errorWeight: '❌ Weight must be greater than 0 and less than 100000',
      errorPurity: '❌ Purity must be between 0 and 100',
      confirmBtn: '✅ Confirm',
      cancelBtn: '❌ Cancel',
      back: '🔙 Back',
      mainMenu: '🏠 Main Menu',
      skipComment: 'Skip',
      sendPhotoRequired: '📸 Please send shipment photo',
      waitingPhoto: '📸 Please send a photo',
      confirmChooseAction: '❌ Choose: Confirm, Cancel, Back, or Main Menu.',
      labelFrom: 'From',
      labelTo: 'To',
      labelType: 'Type',
      labelWeight: 'Weight',
      labelPurity: 'Purity',
      labelComment: 'Comment'
    }
  };

  return tr[lang] || tr.ru;
}

module.exports = {
  start,
  handleText,
  handlePhoto
};