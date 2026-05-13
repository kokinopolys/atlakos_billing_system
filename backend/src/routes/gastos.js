const express = require('express');
const router = express.Router();
const { gastosDb, cxpDb, configDb } = require('../db/database');
const { nowHN } = require('../utils/time');

const CATEGORIAS = [
  'Infraestructura Cloud',
  'Licencias de Software',
  'Marketing',
  'Sueldos y Honorarios',
  'Servicios Profesionales',
  'Equipo y Hardware',
  'Oficina y Administración',
  'Capacitación',
  'Otros',
];

function today() { return new Date().toISOString().slice(0, 10); }

async function nextCxpNumber() {
  const seq = await configDb.findOne({ key: 'cxp_sequence' });
  const n = seq ? parseInt(seq.value) + 1 : 1;
  if (seq) await configDb.update({ key: 'cxp_sequence' }, { $set: { value: String(n) } });
  else     await configDb.insert({ key: 'cxp_sequence', value: String(n) });
  return 'CXP-' + String(n).padStart(6, '0');
}

async function syncCxpForGasto(gasto) {
  const isCredit = gasto.tipo_pago && gasto.tipo_pago !== 'al_contado';
  const existing = await cxpDb.findOne({ source: 'gasto', source_id: gasto._id });

  if (!isCredit) {
    if (existing) await cxpDb.remove({ _id: existing._id });
    return;
  }

  const payload = {
    supplier_name: gasto.description,
    description:   gasto.categoria || 'Otros',
    amount:        gasto.monto,
    date:          gasto.date,
    due_date:      gasto.fecha_limite_pago || '',
    reference:     gasto.tipo_pago || '',
    source:        'gasto',
    source_id:     gasto._id,
  };

  if (existing) {
    if (existing.status === 'pagada') return; // don't overwrite paid entries
    await cxpDb.update({ _id: existing._id }, { $set: payload });
  } else {
    const number = await nextCxpNumber();
    await cxpDb.insert({ ...payload, number, status: 'pendiente', paid_amount: 0, created_at: nowHN() });
  }
}

// GET /api/gastos/categorias
router.get('/categorias', (req, res) => res.json(CATEGORIAS));

// GET /api/gastos
router.get('/', async (req, res) => {
  try {
    const { from, to, categoria } = req.query;
    let items = await gastosDb.find({}).sort({ date: -1 });
    if (from)      items = items.filter(g => g.date >= from);
    if (to)        items = items.filter(g => g.date <= to);
    if (categoria) items = items.filter(g => g.categoria === categoria);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// POST /api/gastos
router.post('/', async (req, res) => {
  try {
    const { description, monto, categoria, date, notes, tipo_pago, fecha_limite_pago } = req.body;
    if (!description || !monto || !date) {
      return res.status(400).json({ error: 'Descripción, monto y fecha son requeridos' });
    }
    const doc = {
      description:       description.trim(),
      monto:             parseFloat(monto) || 0,
      categoria:         (categoria || 'Otros').trim(),
      date,
      notes:             (notes || '').trim(),
      tipo_pago:         tipo_pago || 'al_contado',
      fecha_limite_pago: (tipo_pago && tipo_pago !== 'al_contado') ? (fecha_limite_pago || '') : '',
      created_at:        nowHN(),
    };
    const inserted = await gastosDb.insert(doc);
    await syncCxpForGasto(inserted).catch(console.error);
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
});

// PUT /api/gastos/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await gastosDb.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });

    const { description, monto, categoria, date, notes, tipo_pago, fecha_limite_pago } = req.body;
    const updates = {
      description:       (description || '').trim(),
      monto:             parseFloat(monto) || 0,
      categoria:         (categoria || 'Otros').trim(),
      date,
      notes:             (notes || '').trim(),
      tipo_pago:         tipo_pago || 'al_contado',
      fecha_limite_pago: (tipo_pago && tipo_pago !== 'al_contado') ? (fecha_limite_pago || '') : '',
      updated_at:        nowHN(),
    };
    await gastosDb.update({ _id: req.params.id }, { $set: updates });
    const updated = await gastosDb.findOne({ _id: req.params.id });
    await syncCxpForGasto(updated).catch(console.error);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
});

// DELETE /api/gastos/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await gastosDb.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
    await gastosDb.remove({ _id: req.params.id });
    await cxpDb.remove({ source: 'gasto', source_id: req.params.id }).catch(console.error);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

module.exports = router;
