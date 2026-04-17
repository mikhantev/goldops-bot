const sites = require('./sites');

let userState = {};

// ==================== ЗАПУСК ====================
async function start(ctx) {
  console.log('🚀 SEND FLOW STARTED');

  try {
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

    if (!isDirector && userData.defaultSite) {
      console.log('👤 OPERATOR MODE, DEFAULT SITE =', userData.defaultSite);

      userState[userId].fromSite = userData.defaultSite;
      userState[userId].fromSiteName = userData.defaultSiteName || userData.defaultSite;

      await proceedToToSite(ctx, userId);
      return;
    }

    const miningSites = await sites.getMiningSites();
    console.log('SEND > miningSites =', JSON.stringify(miningSites, null, 2));

    if (!miningSites || miningSites.length === 0) {
      await ctx.reply('❌ Участки не загрузились из таблицы. Попробуйте позже.');
      return;
    }

    const keyboard = miningSites.map(site => [
      { text: `${site.name || site.code} (${site.code})` }
    ]);
    keyboard.push([{ text: t.back }, { text: t.mainMenu }]);

    await ctx.reply(t.chooseFromSite, {
      reply_markup: {
        keyboard,
        resize_keyboard: true
      }
    });
  } catch (error) {
    console.error('❌ SEND FLOW ERROR:', error);
    await ctx.reply('❌ Ошибка при запуске отправки золота');
  }
}

async function getUserData(userId) {
  const isDirector = 
    userId.toString() === '123456789' || 
    userId.toString() === '344577046';

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
  console.log('📦 SEND > warehouses =', JSON.stringify(warehouses, null, 2));

  if (!warehouses || warehouses.length === 0) {
    await ctx.reply('❌ Склады не загрузились из таблицы');
    return;
  }

  const keyboard = warehouses.map(w => [{ text: `${w.name || w.code} (${w.code})` }]);
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

// ==================== ОБРАБОТКА ТЕКСТА ====================
async function handleText(ctx) {
  try {
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

    // FROM SITE
    if (state.step === 'select_from_site') {
      const miningSites = await sites.getMiningSites();
      const site = miningSites.find(s => 
        s.code === text || 
        `${s.name} (${s.code})` === text
      );

      if (!site) return ctx.reply(t.errorInvalidSite);

      state.fromSite = site.code;
      state.fromSiteName = site.name || site.code;
      return proceedToToSite(ctx, userId);
    }

    // TO SITE
    if (state.step === 'select_to_site') {
      const warehouses = await sites.getWarehouses();
      const wh = warehouses.find(w => 
        w.code === text || 
        `${w.name} (${w.code})` === text
      );

      if (!wh) return ctx.reply(t.errorInvalidWarehouse);

      state.toSite = wh.code;
      state.toSiteName = wh.name || wh.code;

      state.step = 'select_gold_type';
      if (state.history[state.history.length - 1] !== 'select_gold_type') {
        state.history.push('select_gold_type');
      }

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

    // GOLD TYPE
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

    // WEIGHT
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

    // PURITY
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

    // COMMENT
    if (state.step === 'enter_comment') {
      state.comment = (text.toLowerCase() === 'skip' || text === t.skipComment) ? '' : text;
      state.step = 'confirm';
      if (state.history[state.history.length - 1] !== 'confirm') {
        state.history.push('confirm');
      }
      return showConfirmation(ctx, state);
    }

    // CONFIRM
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
    }
  } catch (error) {
    console.error('❌ SEND handleText ERROR:', error);
    await ctx.reply('❌ Ошибка обработки отправки');
  }
}

async function showConfirmation(ctx, s) {
  const t = getTranslations(s.language);

  const message = 
    `${t.confirmationHeader}\n\n` +
    `From: ${s.fromSiteName}\n` +
    `To: ${s.toSiteName}\n` +
    `Type: ${s.goldType}\n` +
    `Weight: ${s.weight} g\n` +
    `Purity: ${s.purity}%\n` +
    (s.comment ? `Comment: ${s.comment}\n` : '') +
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
  try {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state || state.step !== 'send_photo') {
      return ctx.reply('❌ Фото можно отправить только после подтверждения.');
    }

    const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
    if (!photo) {
      return ctx.reply('❌ Фото не получено.');
    }

    const fileId = photo.file_id;
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
      photoFileId: fileId,
      status: 'CREATED'
    });

    if (!saved) {
      return ctx.reply('❌ Не удалось сохранить отправку в таблицу.');
    }

    const t = getTranslations(state.language);

    await ctx.reply(
      `${t.successMessage || '✅ Отправка успешно сохранена'}\nID: ${shipmentId}`
    );

    const lang = state.language || 'ru';
    delete userState[userId];
    return require('./menu').showMainMenu(ctx, lang);

  } catch (error) {
    console.error('❌ handlePhoto ERROR:', error);
    await ctx.reply('❌ Ошибка при сохранении фото');
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
  if (state.step === 'enter_weight') return ctx.reply(t.enterWeight);
  if (state.step === 'enter_purity') return ctx.reply(t.enterPurity);
  if (state.step === 'enter_comment') return ctx.reply(t.enterComment);
  if (state.step === 'confirm') return showConfirmation(ctx, state);
}

function getTranslations(lang) {
  const tr = {
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
      sendPhotoRequired: '📸 Пришлите фото отправки золота'
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
      sendPhotoRequired: '📸 Please send shipment photo'
    }
  };
  return tr[lang] || tr.ru;
}

module.exports = {
  start,
  handleText,
  handlePhoto
};