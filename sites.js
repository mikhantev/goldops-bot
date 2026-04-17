const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const config = require('./config');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

// ==================== AUTH ====================
function getAuthClient() {
  let email;
  let key;

  console.log('BASE64_EXISTS =', !!config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64);

  if (config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const jsonString = Buffer.from(
      config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
      'base64'
    ).toString('utf8');

    console.log('BASE64 JSON PREVIEW =', jsonString.slice(0, 120));

    const creds = JSON.parse(jsonString);

    console.log('PARSED CLIENT EMAIL =', creds.client_email);
    console.log('PARSED PRIVATE KEY EXISTS =', !!creds.private_key);
    console.log('PRIVATE KEY START =', creds.private_key ? creds.private_key.slice(0, 30) : null);

    email = creds.client_email;
    key = creds.private_key;
  } else {
    email = config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    key = config.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  }

  console.log('SPREADSHEET_ID =', config.SPREADSHEET_ID);
  console.log('SERVICE_ACCOUNT_EMAIL =', email);
  console.log('PRIVATE_KEY_EXISTS =', !!key);

  if (!config.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is missing');
  if (!email) throw new Error('Service account email is missing');
  if (!key) throw new Error('Service account private key is missing');

  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

// ==================== DOC ====================
async function getDoc() {
  const auth = getAuthClient();
  const doc = new GoogleSpreadsheet(config.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  console.log('DOC TITLE =', doc.title);
  return doc;
}

// ==================== MINING SITES ====================
async function getMiningSites() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL && cache.mining) {
    console.log('MINING SITES FROM CACHE =', cache.mining);
    return cache.mining;
  }

  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['01_Sites'];
    if (!sheet) {
      console.error('❌ Sheet 01_Sites not found');
      return [];
    }

    // Важно: headerRowIndex: 0 — заголовки в первой строке
    const rows = await sheet.getRows({ headerRowIndex: 0 });

    console.log('01_Sites rows count =', rows.length);

    if (rows.length > 0) {
      console.log('FIRST SITE ROW RAW =', rows[0]._rawData);
      console.log('FIRST SITE ROW Site_ID =', rows[0].Site_ID);
      console.log('FIRST SITE ROW Site_Name =', rows[0].Site_Name);
      console.log('FIRST SITE ROW Status =', rows[0].Status);
    }

    const mining = rows.map((row, i) => {
      const code = String(row.Site_ID || row.get('Site_ID') || '').trim();
      const name = String(row.Site_Name || row.get('Site_Name') || '').trim();
      const status = String(row.Status || row.get('Status') || '').trim().toLowerCase();

      console.log(`ROW ${i}:`, { code, name, status });

      return { code, name, status };
    }).filter(x => x.code && x.status === 'active');

    console.log('MINING SITES LOADED =', mining);

    cache = cache || {};
    cache.mining = mining;
    cacheTime = now;

    return mining;
  } catch (error) {
    console.error('❌ Error loading Mining Sites FULL:', error);
    return [];
  }
}

// ==================== WAREHOUSES ====================
async function getWarehouses() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL && cache.warehouses) {
    console.log('WAREHOUSES FROM CACHE =', cache.warehouses);
    return cache.warehouses;
  }

  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['03_Warehouses'];
    if (!sheet) {
      console.error('❌ Sheet 03_Warehouses not found');
      return [];
    }

    const rows = await sheet.getRows({ headerRowIndex: 0 });

    console.log('03_Warehouses rows count =', rows.length);

    const warehouses = rows
      .filter(row => String(row.Status || row.get('Status') || '').trim().toLowerCase() === 'active')
      .map(row => ({
        code: row.Warehouse_ID || row.get('Warehouse_ID') || row.WarehouseCode || row.get('WarehouseCode'),
        name: row.Warehouse_Name || row.get('Warehouse_Name') || row.WarehouseName || row.get('WarehouseName')
      }))
      .filter(x => x.code);

    console.log('WAREHOUSES LOADED =', warehouses);

    cache = cache || {};
    cache.warehouses = warehouses;
    cacheTime = now;

    return warehouses;
  } catch (error) {
    console.error('❌ Error loading Warehouses FULL:', error);
    return [];
  }
}

module.exports = {
  getMiningSites,
  getWarehouses
};