const sites = require('./sites');

/** Глобальное хранилище языка пользователя (надёжнее ctx.session) */
const userLanguage = {};

/**
 * @typedef {Object} UserState
 * @property {string} step
 * @property {string[]} history
 * @property {'ru'|'en'} language
 * @property {boolean} isDirector
 * @property {string} [defaultSite]
 * @property {string} [defaultSiteName]
 * @property {string} [fromSite]
 * @property {string} [fromSiteName]
 * @property {string} [toSite]
 * @property {string} [toSiteName]
 * @property {string} [goldType]
 * @property {number} [weight]
 * @property {number} [purity]
 * @property {string} [comment]
 * @property {string} [photoFileId]
 * @property {number} [latitude]
 * @property {number} [longitude]
 */

/** @type {Object.<number, UserState>} */
let userState = {};

/** @type {Object.<'ru'|'en', Object>} */
const translations = {
  ru: {
    chooseFromSite: '📍 Откуда отправляем:',
    chooseToSite: '📍 Куда отправляем:',
    chooseGoldType: '🔸 Выберите тип золота:',
    enterWeight: '⚖️ Введите вес в граммах:',
    enterPurity: '💎 Введите чистоту (%):',
    enterComment: '💬 Введите комментарий или "Пропустить":',
    confirmationHeader: '📦 Подтверждение отправки',
    confirmQuestion: 'Всё верно?',
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
    sendLocationRequired: '📍 Пришлите геолокацию отправки (обязательно)',
    sendLocationBtn: '📍 Отправить мою геолокацию',
    successMessage: '✅ Отправка золота успешно сохранена!\n\n',
    locationSaved: 'Геолокация сохранена',
    openMap: 'Открыть на карте',
    saveError: '❌ Не удалось сохранить отправку',
    sitesLoadError: '❌ Участки не загрузились из таблицы. Попробуйте позже.',
    warehousesLoadError: '❌ Склады не загрузились из таблицы',
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
    confirmationHeader: '📦 Shipment confirmation',
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
    sendLocationRequired: '📍 Please send location of the shipment (required)',
    sendLocationBtn: '📍 Send my location',
    successMessage: '✅ Gold shipment successfully saved!\n\n',
    locationSaved: 'Location saved',
    openMap: 'Open on map',
    saveError: '❌ Failed to save shipment',
    sitesLoadError: '❌ Sites failed to load from table. Please try later.',
    warehousesLoadError: '❌ Warehouses failed to load from table',
    labelFrom: 'From',
    labelTo: 'To',
    labelType: 'Type',
    labelWeight: 'Weight',
    labelPurity: 'Purity',
    labelComment: 'Comment'
  }
};

/** @param {string} lang */
function getTranslations(lang) {
  return translations[lang] || translations.ru;
}

// ==================== ЗАПУСК ====================
async function start(ctx) {
  console.log('🚀 SEND FLOW STARTED');

  try {
    const userId = ctx.from.id;

    // Надёжное получение языка из глобального хранилища + сессии
    let lang = userLanguage[userId] || ctx.session?.language || 'ru';
    if (lang !== 'ru' && lang !== 'en') lang = 'ru';

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

    console.log(`[SEND] User ${userId} started with language: ${lang}`);

    if (!isDirector && userData.defaultSite) {
      userState[userId].fromSite = userData.defaultSite;
      userState[userId].fromSiteName = userData.defaultSiteName || userData.defaultSite;
      await proceedToToSite(ctx, userId);
      return;
    }

    const miningSites = await sites.getMiningSites();

    if (!miningSites || miningSites.length === 0) {
      return ctx.reply(t.sitesLoadError);
    }

    const keyboard = miningSites.map(site => [
      { text: `${site.name || site.code} (${site.code})` }
    ]);
    keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

    await ctx.reply(t.chooseFromSite, {
      reply_markup: { keyboard, resize_keyboard: true }
    });
  } catch (error) {
    console.error('❌ SEND FLOW ERROR:', error);
    await ctx.reply('❌ Ошибка запуска отправки золота / Error starting send gold');
  }
}

async function getUserData(userId) {
  const isDirector = ['344577046', '123456789'].includes(userId.toString());
  return {
    role: isDirector ? 'director' : 'operator',
    defaultSite: 'SITE-001',
    defaultSiteName: 'Site 1'
  };
}

async function proceedToToSite(ctx, userId) {
  const state = userState[userId];
  const t = getTranslations(state.language);

  const warehouses = await sites.getWarehouses();
  if (!warehouses || warehouses.length === 0) {
    return ctx.reply(t.warehousesLoadError);
  }

  const keyboard = warehouses.map(w => [{ text: `${w.name || w.code} (${w.code})` }]);
  keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

  await ctx.reply(t.chooseToSite, {
    reply_markup: { keyboard, resize_keyboard: true }
  });

  state.step = 'select_to_site';
  if (state.history[state.history.length - 1] !== 'select_to_site') {
    state.history.push('select_to_site');
  }
}

// ==================== ОБРАБОТКА ТЕКСТА ====================
async function handleText(ctx) {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const state = userState[userId];

    if (!state) {
      await ctx.reply('Начните заново через меню / Start again from menu');
      return;
    }

    const t = getTranslations(state.language);

    if (text === t.mainMenu) {
      delete userState[userId];
      return require('./menu').showMainMenu(ctx, state.language);
    }

    if (text === t.back) {
      return goBack(ctx, userId);
    }

    if (state.step === 'select_from_site') {
      const miningSites = await sites.getMiningSites();
      const site = miningSites.find(s => 
        s.code === text || `${s.name || s.code} (${s.code})` === text
      );
      if (!site) return ctx.reply(t.errorInvalidSite);

      state.fromSite = site.code;
      state.fromSiteName = site.name || site.code;
      return proceedToToSite(ctx, userId);
    }

    if (state.step === 'select_to_site') {
      const warehouses = await sites.getWarehouses();
      const wh = warehouses.find(w => 
        w.code === text || `${w.name || w.code} (${w.code})` === text
      );
      if (!wh) return ctx.reply(t.errorInvalidWarehouse);

      state.toSite = wh.code;
      state.toSiteName = wh.name || wh.code;

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

    if (state.step === 'select_gold_type') {
      if (!['Raw Gold', 'Concentrate', 'Dore'].includes(text)) return ctx.reply(t.errorInvalidGoldType);
      state.goldType = text;
      state.step = 'enter_weight';
      state.history.push('enter_weight');
      return ctx.reply(t.enterWeight);
    }

    if (state.step === 'enter_weight') {
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight <= 0 || weight > 100000) return ctx.reply(t.errorWeight);
      state.weight = weight;
      state.step = 'enter_purity';
      state.history.push('enter_purity');
      return ctx.reply(t.enterPurity);
    }

    if (state.step === 'enter_purity') {
      const purity = parseFloat(text.replace(',', '.'));
      if (isNaN(purity) || purity < 0 || purity > 100) return ctx.reply(t.errorPurity);
      state.purity = purity;
      state.step = 'enter_comment';
      state.history.push('enter_comment');
      return ctx.reply(t.enterComment);
    }

    if (state.step === 'enter_comment') {
      state.comment = (text.toLowerCase() === 'skip' || text === t.skipComment) ? '' : text;
      state.step = 'confirm';
      state.history.push('confirm');
      return showConfirmation(ctx, state);
    }

    if (state.step === 'confirm') {
      if (text === t.confirmBtn) {
        state.step = 'send_photo';
        state.history.push('send_photo');
        return ctx.reply(t.sendPhotoRequired);
      }
      if (text === t.cancelBtn) {
        delete userState[userId];
        await ctx.reply(t.operationCancelled);
        return require('./menu').showMainMenu(ctx, state.language);
      }
    }
  } catch (error) {
    console.error('❌ SEND handleText ERROR:', error);
    await ctx.reply('❌ Ошибка обработки отправки / Processing error');
  }
}

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

  await ctx.reply(message, {
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

// ==================== PHOTO + LOCATION ====================
async function handlePhoto(ctx) {
  try {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state || state.step !== 'send_photo') {
      return ctx.reply(getTranslations(state?.language || 'ru').sendPhotoRequired);
    }

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    state.photoFileId = photo.file_id;

    const t = getTranslations(state.language);

    state.step = 'send_location';
    state.history.push('send_location');

    await ctx.reply(t.sendLocationRequired, {
      reply_markup: {
        keyboard: [[{ text: t.sendLocationBtn, request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } catch (error) {
    console.error('❌ handlePhoto ERROR:', error);
    await ctx.reply('❌ Ошибка при обработке фото');
  }
}

async function handleLocation(ctx) {
  try {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state || state.step !== 'send_location') {
      return ctx.reply('❌ Отправьте геолокацию после фото');
    }

    const location = ctx.message.location;
    state.latitude = location.latitude;
    state.longitude = location.longitude;

    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${state.latitude},${state.longitude}`;

    const shipmentId = `SHP-${Date.now()}`;

    const saved = await sites.addGoldShipment({
      shipmentId,
      createdAt: new Date().toISOString(),
      userId: userId.toString(),
      fromSiteId: state.fromSite,
      fromSiteName: state.fromSiteName,
      toWarehouseId: state.toSite,
      toWarehouseName: state.toSiteName,
      goldType: state.goldType,
      weight: state.weight,
      purity: state.purity,
      comment: state.comment || '',
      photoFileId: state.photoFileId,
      latitude: state.latitude,
      longitude: state.longitude,
      googleMapsLink: googleMapsLink,
      status: 'CREATED'
    });

    const t = getTranslations(state.language);

    if (saved) {
      await ctx.replyWithLocation(state.latitude, state.longitude);
      await ctx.reply(
        `${t.successMessage}ID: ${shipmentId}\n\n` +
        `📍 ${t.locationSaved}\n` +
        `🔗 [${t.openMap}](${googleMapsLink})`
      );
    } else {
      await ctx.reply(t.saveError);
    }

    delete userState[userId];
    return require('./menu').showMainMenu(ctx, state.language);

  } catch (error) {
    console.error('❌ handleLocation ERROR:', error);
    await ctx.reply('❌ Ошибка при сохранении геолокации');
  }
}

async function goBack(ctx, userId) {
  const state = userState[userId];
  if (!state || state.history.length <= 1) {
    delete userState[userId];
    return require('./menu').showMainMenu(ctx, 'ru');
  }

  state.history.pop();
  state.step = state.history[state.history.length - 1];

  const t = getTranslations(state.language);

  if (state.step === 'select_from_site') return start(ctx);
  if (state.step === 'select_to_site') return proceedToToSite(ctx, userId);
  if (state.step === 'select_gold_type') {
    return ctx.reply(t.chooseGoldType, {
      reply_markup: { keyboard: [['Raw Gold', 'Concentrate'], ['Dore'], [t.back, t.mainMenu]], resize_keyboard: true }
    });
  }
  if (state.step === 'enter_weight') return ctx.reply(t.enterWeight);
  if (state.step === 'enter_purity') return ctx.reply(t.enterPurity);
  if (state.step === 'enter_comment') return ctx.reply(t.enterComment);
  if (state.step === 'confirm') return showConfirmation(ctx, state);
  if (state.step === 'send_photo') return ctx.reply(t.sendPhotoRequired);
  if (state.step === 'send_location') {
    return ctx.reply(t.sendLocationRequired, {
      reply_markup: { keyboard: [[{ text: t.sendLocationBtn, request_location: true }]], resize_keyboard: true }
    });
  }
}

module.exports = {
  start,
  handleText,
  handlePhoto,
  handleLocation
};