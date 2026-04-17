const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('./config');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function getDoc() {
  console.log('SPREADSHEET_ID =', config.SPREADSHEET_ID);
  console.log('SERVICE_ACCOUNT_EMAIL =', config.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log('PRIVATE_KEY_EXISTS =', !!config.GOOGLE_PRIVATE_KEY);

  if (!config.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID is missing');
  }
  if (!config.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is missing');
  }
  if (!config.GOOGLE_PRIVATE_KEY) {
    throw new Error('GOOGLE_PRIVATE_KEY is missing');
  }

  const doc = new GoogleSpreadsheet(config.SPREADSHEET_ID);

  await doc.useServiceAccountAuth({
    client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });

  await doc.loadInfo();
  console.log('DOC TITLE =', doc.title);
  console.log('SHEETS =', Object.keys(doc.sheetsByTitle));

  return doc;
}

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

    const rows = await sheet.getRows();
    console.log('01_Sites rows count =', rows.length);

    const mining = rows
      .filter(row => (row.Status || row.get('Status')) === 'Active')
      .map(row => ({
        code: row.Site_ID || row.SiteCode || row.get('Site_ID'),
        name: row.Site_Name || row.SiteName || row.get('Site_Name')
      }))
      .filter(x => x.code || x.name);

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

    const rows = await sheet.getRows();
    console.log('03_Warehouses rows count =', rows.length);

    const warehouses = rows
      .filter(row => (row.Status || row.get('Status')) === 'Active')
      .map(row => ({
        code: row.Warehouse_ID || row.WarehouseCode || row.get('Warehouse_ID'),
        name: row.Warehouse_Name || row.WarehouseName || row.get('Warehouse_Name')
      }))
      .filter(x => x.code || x.name);

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

async function addGoldShipment(data) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['04_Gold_Shipments'];

    if (!sheet) {
      throw new Error('Sheet "04_Gold_Shipments" not found');
    }

    await sheet.addRow({
      Shipment_ID: data.shipmentId,
      Created_At: data.createdAt,
      User_ID: data.userId,
      From_Site_ID: data.fromSiteId,
      From_Site_Name: data.fromSiteName,
      To_Warehouse_ID: data.toWarehouseId,
      To_Warehouse_Name: data.toWarehouseName,
      Gold_Type: data.goldType,
      Weight_g: data.weight,
      Purity_pct: data.purity,
      Comment: data.comment || '',
      Photo_File_ID: data.photoFileId || '',
      Status: data.status || 'CREATED'
    });

    return true;
  } catch (error) {
    console.error('❌ Error adding Gold Shipment FULL:', error);
    return false;
  }
}

module.exports = {
  getMiningSites,
  getWarehouses,
  addGoldShipment
};