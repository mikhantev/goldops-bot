const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('./config');

// Кэш для производительности
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

async function getDoc() {
  const doc = new GoogleSpreadsheet(config.SPREADSHEET_ID);

  await doc.useServiceAccountAuth({
    client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  });

  await doc.loadInfo();
  return doc;
}

async function getMiningSites() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL && cache.mining) {
    return cache.mining;
  }

  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['01_Sites'];
    const rows = await sheet.getRows();

    const mining = rows
      .filter(row => (row.Status || row.get('Status')) === 'Active')
      .map(row => ({
        code: row.Site_ID || row.SiteCode || row.get('Site_ID'),
        name: row.Site_Name || row.SiteName || row.get('Site_Name')
      }));

    cache = cache || {};
    cache.mining = mining;
    cacheTime = now;

    return mining;
  } catch (error) {
    console.error('❌ Error loading Mining Sites:', error.message);
    return [];
  }
}

async function getWarehouses() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL && cache.warehouses) {
    return cache.warehouses;
  }

  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['03_Warehouses'];
    const rows = await sheet.getRows();

    const warehouses = rows
      .filter(row => (row.Status || row.get('Status')) === 'Active')
      .map(row => ({
        code: row.Warehouse_ID || row.WarehouseCode || row.get('Warehouse_ID'),
        name: row.Warehouse_Name || row.WarehouseName || row.get('Warehouse_Name')
      }));

    cache = cache || {};
    cache.warehouses = warehouses;
    cacheTime = now;

    return warehouses;
  } catch (error) {
    console.error('❌ Error loading Warehouses:', error.message);
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
    console.error('❌ Error adding Gold Shipment:', error.message);
    return false;
  }
}

module.exports = {
  getMiningSites,
  getWarehouses,
  addGoldShipment
};