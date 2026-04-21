const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const invoicesDb = Datastore.create({
  filename: path.join(dataDir, 'invoices.db'),
  autoload: true,
});

const configDb = Datastore.create({
  filename: path.join(dataDir, 'config.db'),
  autoload: true,
});

const usersDb = Datastore.create({
  filename: path.join(dataDir, 'users.db'),
  autoload: true,
});

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
    await usersDb.insert({
      username: 'devs.mrs',
      password: hash,
      name: 'Administrador',
      createdAt: new Date().toISOString(),
    });
  }
}

seedConfig().catch(console.error);
seedUsers().catch(console.error);

module.exports = { invoicesDb, configDb, usersDb };
