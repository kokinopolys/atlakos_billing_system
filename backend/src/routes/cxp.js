const express = require('express');
const { cxpDb, configDb } = require('../db/database');
const router = express.Router();

async function nextNumber() {
  const seq = await configDb.findOne({ key: 'cxp_sequence' });
  const n = seq ? parseInt(seq.value) + 1 : 1;
  if (seq) await configDb.update({ key: 'cxp_sequence' }, { $set: { value: String(n) } });
  else     await configDb.insert({ key: 'cxp_sequence', value: String(n) });
  return 'CXP-' + String(n).padStart(6, '0');
}

function today() { return new Date().toISOString().slice(0, 10); }

function applyOverdue(docs) {
  const t = today();
  return docs.map(d =>
    d.status === 'pendiente' && d.due_date && d.due_date < t
      ? { ...d, status: 'vencida' }
      : d
  );
}

// GET /api/cxp/resumen
router.get('/resumen', async (req, res) => {
  try {
    const docs = applyOverdue(await cxpDb.find({}));
    const t = today();
    let pendiente = 0, pagada = 0, vencida = 0;
    for (const d of docs) {
      if (d.status === 'anulada') continue;
      const amount = parseFloat(d.amount) || 0;
      const paid   = parseFloat(d.paid_amount) || 0;
      if (d.status === 'pagada')                           pagada    += amount;
      else if (d.due_date && d.due_date < t)              vencida   += (amount - paid);
      else                                                 pendiente += (amount - paid);
    }
    res.json({ pendiente, pagada, vencida });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cxp
router.get('/', async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let docs = applyOverdue(await cxpDb.find({}));
    if (status && status !== 'all') docs = docs.filter(d => d.status === status);
    if (from) docs = docs.filter(d => d.date >= from);
    if (to)   docs = docs.filter(d => d.date <= to);
    docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cxp
router.post('/', async (req, res) => {
  try {
    const number = await nextNumber();
    const doc = { ...req.body, number, status: req.body.status || 'pendiente', paid_amount: 0, created_at: new Date().toISOString() };
    res.json(await cxpDb.insert(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cxp/:id
router.put('/:id', async (req, res) => {
  try {
    await cxpDb.update({ _id: req.params.id }, { $set: req.body });
    res.json(await cxpDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/cxp/:id/pay
router.patch('/:id/pay', async (req, res) => {
  try {
    const doc = await cxpDb.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    const total  = parseFloat(doc.amount) || 0;
    const paid   = parseFloat(req.body.paid_amount) ?? total;
    const status = paid >= total ? 'pagada' : 'parcial';
    await cxpDb.update({ _id: req.params.id }, { $set: { paid_amount: paid, paid_date: req.body.paid_date || today(), payment_method: req.body.payment_method || '', status } });
    res.json(await cxpDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cxp/:id
router.delete('/:id', async (req, res) => {
  try {
    await cxpDb.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
