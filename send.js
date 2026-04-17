const sites = require('./sites');

let userState = {};

// ==================== ЗАПУСК ====================
async function start(ctx) {
  const userId = ctx.from.id;
  const lang = ctx.session?.language || 'ru';

  const userData = await getUserData(userId);
  const isDirector = userData.role === 'director';

  userState[userId] = {
    step: 'select_from_site',
    history: ['select_from_site'],
    language: lang,
    isDirector,
    defaultSite: userData.defaultSite
  };

  const t = getTranslations(lang);

  if (!isDirector && userData.defaultSite) {
    userState[userId].fromSite = userData.defaultSite;
    userState[userId].fromSiteName = userData.defaultSite;
    await proceedToToSite(ctx, userId);
    return;
  }

  const miningSites = await sites.getMiningSites();

  const keyboard = miningSites.map(site => [
    { text: `${site.name} (${site.code})` }
  ]);

  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  await ctx.reply(t.chooseFromSite, {
    reply_markup: { keyboard, resize_keyboard: true }
  });
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
async function getUserData(userId) {
  return {
    role:
      userId.toString() === '123456789' ||
      userId.toString() === '344577046'
        ? 'director'
        : 'operator',
    defaultSite: 'SITE-001'
  };
}

function findByText(list, text) {
  return list.find(
    item =>
      text === item.code ||
      text === item.name ||
      text === `${item.name} (${item.code})`
  );
}

async function proceedToToSite(ctx, userId) {
  const state = userState[userId];
  const t = getTranslations(state.language);

  const warehouses = await sites.getWarehouses();

  const keyboard = warehouses.map(w => [
    { text: `${w.name} (${w.code})` }
  ]);

  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  await ctx.reply(t.chooseToSite, {
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
    await ctx.reply("Начните заново через меню.");
    return;
  }

  const t = getTranslations(state.language);

  if (text === t.mainMenu) {
    const lang = state.language;
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

    if (!site) return ctx.reply(t.errorInvalidSite);

    state.fromSite = site.code;
    state.fromSiteName = site.name;

    return proceedToToSite(ctx, userId);
  }

  // ===== TO SITE =====
  if (state.step === 'select_to_site') {
    const warehouses = await sites.getWarehouses();
    const wh = findByText(warehouses, text);

    if (!wh) return ctx.reply(t.errorInvalidWarehouse);

    state.toSite = wh.code;
    state.toSiteName = wh.name;

    state.step = 'select_gold_type';
    state.history.push('select_gold_type');

    return ctx.reply(t.chooseGoldType, {
      reply_markup: {
        keyboard: [
          ['Raw Gold', 'Concentrate'],
          ['Dore'],
          [t.back, t.mainMenu]
        ],
        resize_keyboard: true
      }
    });
  }

  // ===== GOLD TYPE =====
  if (state.step === 'select_gold_type') {
    if (!['Raw Gold', 'Concentrate', 'Dore'].includes(text)) {
      return ctx.reply("❌ Выберите тип.");
    }

    state.goldType = text;
    state.step = 'enter_weight';
    state.history.push('enter_weight');

    return ctx.reply(t.enterWeight);
  }

  // ===== WEIGHT =====
  if (state.step === 'enter_weight') {
    const weight = parseFloat(text);

    if (isNaN(weight) || weight <= 0) {
      return ctx.reply(t.errorWeight);
    }

    state.weight = weight;
    state.step = 'enter_purity';
    state.history.push('enter_purity');

    return ctx.reply(t.enterPurity);
  }

  // ===== PURITY =====
  if (state.step === 'enter_purity') {
    const purity = parseFloat(text);

    if (isNaN(purity) || purity < 0 || purity > 100) {
      return ctx.reply(t.errorPurity);
    }

    state.purity = purity;
    state.step = 'enter_comment';
    state.history.push('enter_comment');

    return ctx.reply(t.enterComment);
  }

  // ===== COMMENT =====
  if (state.step === 'enter_comment') {
    state.comment =
      text.toLowerCase() === 'skip' || text === t.skipComment ? '' : text;

    state.step = 'confirm';
    state.history.push('confirm');

    return showConfirmation(ctx, state);
  }

  // ===== CONFIRM =====
  if (state.step === 'confirm') {
    if (text === t.confirmBtn) {
      state.step = 'send_photo';
      return ctx.reply("📸 Пришлите фото");
    }

    if (text === t.cancelBtn) {
      delete userState[userId];
      return require('./menu').showMainMenu(ctx, state.language);
    }
  }
}

// ==================== ПОДТВЕРЖДЕНИЕ ====================
function showConfirmation(ctx, s) {
  return ctx.reply(
    `📦 Подтверждение:\n\n` +
      `From: ${s.fromSiteName}\n` +
      `To: ${s.toSiteName}\n` +
      `Type: ${s.goldType}\n` +
      `Weight: ${s.weight} g\n` +
      `Purity: ${s.purity}%\n` +
      `\nПодтвердить?`,
    {
      reply_markup: {
        keyboard: [
          ['✅ Подтвердить'],
          ['❌ Отменить'],
          ['🔙 Назад', '🏠 Главное меню']
        ],
        resize_keyboard: true
      }
    }
  );
}

// ==================== ФОТО + ЗАПИСЬ ====================
async function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (!state || state.step !== 'send_photo') return;

  const fileId = ctx.message.photo.pop().file_id;

  const shipmentId = `SHP-${Date.now()}`;

  await sites.addGoldShipment({
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

  await ctx.reply(`✅ Отправка сохранена\nID: ${shipmentId}`);

  delete userState[userId];

  return require('./menu').showMainMenu(ctx, state.language);
}

// ==================== НАЗАД ====================
async function goBack(ctx, userId) {
  const state = userState[userId];

  if (!state || state.history.length <= 1) {
    delete userState[userId];
    return require('./menu').showMainMenu(ctx);
  }

  state.history.pop();
  state.step = state.history[state.history.length - 1];

  const t = getTranslations(state.language);

  if (state.step === 'select_from_site') return start(ctx);
  if (state.step === 'select_to_site') return proceedToToSite(ctx, userId);
  if (state.step === 'select_gold_type') {
    return ctx.reply(t.chooseGoldType);
  }
}

// ==================== ПЕРЕВОДЫ ====================
function getTranslations(lang) {
  return {
    ru: {
      chooseFromSite: '📍 Откуда отправляем:',
      chooseToSite: '📍 Куда отправляем:',
      chooseGoldType: 'Тип золота:',
      enterWeight: 'Введите вес:',
      enterPurity: 'Введите чистоту:',
      enterComment: 'Комментарий:',
      errorInvalidSite: 'Ошибка участка',
      errorInvalidWarehouse: 'Ошибка склада',
      errorWeight: 'Ошибка веса',
      errorPurity: 'Ошибка чистоты',
      confirmBtn: '✅ Подтвердить',
      cancelBtn: '❌ Отменить',
      back: '🔙 Назад',
      mainMenu: '🏠 Главное меню',
      skipComment: 'Пропустить'
    }
  }[lang] || {};
}

module.exports = {
  start,
  handleText,
  handlePhoto
};