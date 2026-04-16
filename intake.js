let userState = {};

// ==================== ЗАПУСК ====================
function start(ctx) {
  const userId = ctx.from.id;
  
  let language = 'ru';
  if (ctx.message.text === '📥 Gold Intake') language = 'en';

  userState[userId] = { 
    step: 'select_site',
    history: ['select_site'],
    language: language,
    timestamp: new Date()
  };

  const t = getTranslations(language);

  ctx.reply(t.chooseSite, {
    reply_markup: {
      keyboard: [
        [{ text: "SITE-001" }, { text: "SITE-002" }],
        [{ text: "SITE-003" }],
        [{ text: t.back }]
      ],
      resize_keyboard: true
    }
  });
  console.log(`[INTAKE] User ${userId} started intake process (${language})`);
}

// ==================== ОБРАБОТКА ТЕКСТА ====================
function handleText(ctx) {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState[userId];

  if (!state) return;

  const t = getTranslations(state.language);

  if (text === t.back) {
    goBack(ctx, userId);
    return;
  }

  if (state.step === 'select_site') {
    if (['SITE-001', 'SITE-002', 'SITE-003'].includes(text)) {
      state.site = text;
      state.step = 'select_area';
      state.history.push('select_area');
      ctx.reply(t.chooseArea, { reply_markup: { keyboard: [[{text:"AREA-A"},{text:"AREA-B"}], [{text:"AREA-C"},{text:"AREA-D"}], [{text:t.back}]], resize_keyboard: true }});
    }
  } 
  else if (state.step === 'select_area') {
    state.area = text;
    state.step = 'select_warehouse';
    state.history.push('select_warehouse');
    ctx.reply(t.chooseWarehouse, { reply_markup: { keyboard: [[{text:"WAREHOUSE-01"},{text:"WAREHOUSE-02"}], [{text:"WAREHOUSE-03"}], [{text:t.back}]], resize_keyboard: true }});
  } 
  else if (state.step === 'select_warehouse') {
    state.warehouse = text;
    state.step = 'select_gold_type';
    state.history.push('select_gold_type');
    ctx.reply(t.chooseGoldType, { reply_markup: { keyboard: [[{text:"Raw Gold"}], [{text:"Concentrate"}], [{text:"Dore"}], [{text:t.back}]], resize_keyboard: true }});
  } 
  else if (state.step === 'select_gold_type') {
    if (['Raw Gold', 'Concentrate', 'Dore'].includes(text)) {
      state.goldType = text;
      state.step = 'enter_weight';
      state.history.push('enter_weight');
      ctx.reply(t.enterWeight);
    }
  } 
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
  else if (state.step === 'enter_comment') {
    state.comment = (text === t.skipComment || text.toLowerCase() === 'skip') ? '' : text;
    state.step = 'confirm';
    state.history.push('confirm');
    showConfirmation(ctx, state);
  } 
  else if (state.step === 'confirm') {
    if (text === t.confirmBtn) {
      state.step = 'send_photo';
      ctx.reply(t.sendPhoto);
    } else if (text === t.cancelBtn) {
      ctx.reply(t.operationCancelled);
      const menu = require('./menu.js');
      menu.showMainMenu(ctx);
      delete userState[userId];
      console.log(`[INTAKE] User ${userId} cancelled operation`);
    }
  }
}

// ==================== ПОДТВЕРЖДЕНИЕ ====================
function showConfirmation(ctx, state) {
  const t = getTranslations(state.language);
  const commentLine = state.comment ? `Comment: ${state.comment}\n` : '';

  const message = t.confirmationHeader +
    `Site: ${state.site}\n` +
    `Area: ${state.area}\n` +
    `Warehouse: ${state.warehouse}\n` +
    `Type: ${state.goldType}\n` +
    `Weight: ${state.weight} g\n` +
    `Purity: ${state.purity}%\n` +
    commentLine + `\n${t.confirmQuestion}`;

  ctx.reply(message, {
    reply_markup: {
      keyboard: [
        [{ text: t.confirmBtn }],
        [{ text: t.cancelBtn }],
        [{ text: t.back }]
      ],
      resize_keyboard: true
    }
  });
}

function handlePhoto(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (state && state.step === 'send_photo') {
    const t = getTranslations(state.language);
    const commentLine = state.comment ? `Comment: ${state.comment}\n` : '';

    console.log(`[INTAKE SUCCESS] User ${userId} | Site: ${state.site} | Area: ${state.area} | Weight: ${state.weight}g | Purity: ${state.purity}%`);

    ctx.reply(t.successMessage +
      `Site: ${state.site}\n` +
      `Area: ${state.area}\n` +
      `Warehouse: ${state.warehouse}\n` +
      `Type: ${state.goldType}\n` +
      `Weight: ${state.weight} g\n` +
      `Purity: ${state.purity}%\n` +
      commentLine +
      `\nPhoto received.`);

    setTimeout(() => {
      const menu = require('./menu.js');
      menu.showMainMenu(ctx);
      delete userState[userId];
    }, 2000);
  }
}

// ==================== НАЗАД ====================
function goBack(ctx, userId) {
  const state = userState[userId];
  if (!state || state.history.length <= 1) {
    const menu = require('./menu.js');
    menu.showMainMenu(ctx);
    delete userState[userId];
    return;
  }

  state.history.pop();
  state.step = state.history[state.history.length - 1];

  const t = getTranslations(state.language);

  if (state.step === 'select_site') start(ctx);
  else if (state.step === 'select_area') ctx.reply(t.chooseArea, { reply_markup: { keyboard: [[{text:"AREA-A"},{text:"AREA-B"}], [{text:"AREA-C"},{text:"AREA-D"}], [{text:t.back}]], resize_keyboard: true }});
  else if (state.step === 'select_warehouse') ctx.reply(t.chooseWarehouse, { reply_markup: { keyboard: [[{text:"WAREHOUSE-01"},{text:"WAREHOUSE-02"}], [{text:"WAREHOUSE-03"}], [{text:t.back}]], resize_keyboard: true }});
  else if (state.step === 'select_gold_type') ctx.reply(t.chooseGoldType, { reply_markup: { keyboard: [[{text:"Raw Gold"}], [{text:"Concentrate"}], [{text:"Dore"}], [{text:t.back}]], resize_keyboard: true }});
  else if (state.step === 'enter_weight') ctx.reply(t.enterWeight);
  else if (state.step === 'enter_purity') ctx.reply(t.enterPurity);
  else if (state.step === 'enter_comment') ctx.reply(t.enterComment);
}

// ==================== ПЕРЕВОДЫ ====================
function getTranslations(lang) {
  const translations = {
    ru: {
      chooseSite: '📍 Выберите участок (Site):',
      chooseArea: '📍 Выберите площадь/зону (Area):',
      chooseWarehouse: '🏬 Выберите склад (Warehouse):',
      chooseGoldType: '🔸 Выберите тип золота:',
      enterWeight: '⚖️ Введите вес золота в граммах (только число):',
      enterPurity: '💎 Введите чистоту (%) (например: 92.5):',
      enterComment: '💬 Введите комментарий или напишите "Пропустить":',
      sendPhoto: '📸 Пришлите фото приёма золота (обязательно)',
      confirmationHeader: 'Проверьте данные перед сохранением:\n\n',
      confirmQuestion: 'Всё верно?',
      successMessage: '✅ Приём золота успешно зафиксирован!\n\n',
      operationCancelled: '❌ Операция отменена.',
      back: '🔙 Назад',
      errorNumber: '❌ Пожалуйста, введите только число',
      errorWeight: '❌ Вес должен быть больше 0 и меньше 100000 г',
      errorPurity: '❌ Чистота должна быть от 0 до 100%',
      confirmBtn: '✅ Подтвердить',
      cancelBtn: '❌ Отменить',
      skipComment: 'Пропустить'
    },
    en: {
      chooseSite: '📍 Select Site:',
      chooseArea: '📍 Select Area/Zone:',
      chooseWarehouse: '🏬 Select Warehouse:',
      chooseGoldType: '🔸 Select Gold Type:',
      enterWeight: '⚖️ Enter weight in grams (number only):',
      enterPurity: '💎 Enter purity (%) (e.g. 92.5):',
      enterComment: '💬 Enter comment or type "Skip":',
      sendPhoto: '📸 Send photo of gold intake (required)',
      confirmationHeader: 'Please verify the data before saving:\n\n',
      confirmQuestion: 'Is everything correct?',
      successMessage: '✅ Gold intake successfully recorded!\n\n',
      operationCancelled: '❌ Operation cancelled.',
      back: '🔙 Back',
      errorNumber: '❌ Please enter only a number',
      errorWeight: '❌ Weight must be between 0 and 100000 g',
      errorPurity: '❌ Purity must be between 0 and 100%',
      confirmBtn: '✅ Confirm',
      cancelBtn: '❌ Cancel',
      skipComment: 'Skip'
    }
  };
  return translations[lang] || translations.ru;
}

module.exports = {
  start,
  handleText,
  handlePhoto
};