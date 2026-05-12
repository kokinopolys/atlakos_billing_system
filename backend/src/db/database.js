require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { nowHN } = require('../utils/time');

const USE_MONGO = !!process.env.MONGODB_URI;

let invoicesDb, configDb, usersDb, clientesDb, serviciosDb, gastosDb,
    cxcDb, cxpDb, empleadosDb, vouchersDb;

// ──────────────────────────────────────────────────────────────────────────────
//  MongoDB wrapper — NeDB-compatible API
// ──────────────────────────────────────────────────────────────────────────────

class MongoCollection {
  constructor(col) { this._col = col; }

  find(query = {}) {
    let cursor = this._col.find(query);
    // Return a thenable with .sort() chaining so routes work unchanged
    const api = {
      sort(spec) { cursor = cursor.sort(spec); return api; },
      then(res, rej) { return cursor.toArray().then(res, rej); },
      catch(rej)     { return cursor.toArray().catch(rej); },
    };
    return api;
  }
  findOne(query = {}) { return this._col.findOne(query); }

  async insert(doc) {
    const d = { ...doc };
    if (!d._id) d._id = crypto.randomUUID();
    await this._col.insertOne(d);
    return d;
  }

  update(query, update, opts = {}) {
    const fn = opts.multi ? 'updateMany' : 'updateOne';
    return this._col[fn](query, update, { upsert: !!opts.upsert });
  }

  remove(query, opts = {}) {
    const fn = opts.multi ? 'deleteMany' : 'deleteOne';
    return this._col[fn](query);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Seed data
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULTS = [
  ['company_name',          'MRS DEVS S. DE R. L.'],
  ['company_address',       'Col. Las Torres Contiguo a la Puma B34 S1. Tegucigalpa, M.D.C., Honduras, C.A.'],
  ['company_phone',         '9600-9080'],
  ['company_email',         'devs.mrs@outlook.com'],
  ['company_rtn',           '08019000000000'],
  ['cai',                   ''],
  ['invoice_prefix',        '000-001-01'],
  ['invoice_sequence',      '1'],
  ['cotizacion_prefix',     'COT'],
  ['cotizacion_sequence',   '1'],
  ['authorized_range_from', '000-001-01-00000001'],
  ['authorized_range_to',   '000-001-01-00000100'],
  ['emission_limit_date',   '31-12-2026'],
];

async function seedConfig() {
  for (const [key, value] of DEFAULTS) {
    const existing = await configDb.findOne({ key });
    if (!existing) await configDb.insert({ key, value });
  }
}

async function seedUsers() {
  const existing = await usersDb.findOne({ username: 'devs.mrs' });
  if (!existing) {
    const hash = await bcrypt.hash('devs.mrs1@', 10);
    await usersDb.insert({ username: 'devs.mrs', password: hash, name: 'Administrador', createdAt: nowHN() });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Initialization
// ──────────────────────────────────────────────────────────────────────────────

async function initMongo() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const make = (n) => new MongoCollection(db.collection(n));
  invoicesDb  = make('invoices');
  configDb    = make('config');
  usersDb     = make('users');
  clientesDb  = make('clientes');
  serviciosDb = make('servicios');
  gastosDb    = make('gastos');
  cxcDb       = make('cxc');
  cxpDb       = make('cxp');
  empleadosDb = make('empleados');
  vouchersDb  = make('vouchers');
  console.log('Connected to MongoDB Atlas');
}

function initNeDB() {
  const Datastore = require('nedb-promises');
  const path = require('path');
  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const make = (n) => Datastore.create({ filename: path.join(dataDir, n + '.db'), autoload: true });
  invoicesDb  = make('invoices');
  configDb    = make('config');
  usersDb     = make('users');
  clientesDb  = make('clientes');
  serviciosDb = make('servicios');
  gastosDb    = make('gastos');
  cxcDb       = make('cxc');
  cxpDb       = make('cxp');
  empleadosDb = make('empleados');
  vouchersDb  = make('vouchers');
  console.log('Using NeDB (local file storage)');
}

// ready resolves once DB is initialized and seeds are done
const ready = (async () => {
  if (USE_MONGO) await initMongo();
  else           initNeDB();
  await seedConfig().catch(console.error);
  await seedUsers().catch(console.error);
})();

// Getters so that when routes destructure after ready resolves, they get the real instances
module.exports = {
  ready,
  get invoicesDb()  { return invoicesDb; },
  get configDb()    { return configDb; },
  get usersDb()     { return usersDb; },
  get clientesDb()  { return clientesDb; },
  get serviciosDb() { return serviciosDb; },
  get gastosDb()    { return gastosDb; },
  get cxcDb()       { return cxcDb; },
  get cxpDb()       { return cxpDb; },
  get empleadosDb() { return empleadosDb; },
  get vouchersDb()  { return vouchersDb; },
};
