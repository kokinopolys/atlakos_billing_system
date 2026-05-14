const express = require('express');
const { cxcDb, configDb } = require('../db/database');
const router = express.Router();

async function nextNumber() {
  const seq = await configDb.findOne({ key: 'cxc_sequence' });
  const n = seq ? parseInt(seq.value) + 1 : 1;
  if (seq) await configDb.update({ key: 'cxc_sequence' }, { $set: { value: String(n) } });
  else     await configDb.insert({ key: 'cxc_sequence', value: String(n) });
  return 'CXC-' + String(n).padStart(6, '0');
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

// GET /api/cxc/resumen  — must be before /:id
router.get('/resumen', async (req, res) => {
  try {
    const docs = applyOverdue(await cxcDb.find({}));
    const t = today();
    let pendiente = 0, cobrada = 0, vencida = 0;
    for (const d of docs) {
      if (d.status === 'anulada') continue;
      const amount = parseFloat(d.amount) || 0;
      const paid   = parseFloat(d.paid_amount) || 0;
      if (d.status === 'pagada')                           cobrada  += amount;
      else if (d.due_date && d.due_date < t)              vencida  += (amount - paid);
      else                                                 pendiente += (amount - paid);
    }
    res.json({ pendiente, cobrada, vencida });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cxc
router.get('/', async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let docs = applyOverdue(await cxcDb.find({}));
    if (status && status !== 'all') docs = docs.filter(d => d.status === status);
    if (from) docs = docs.filter(d => d.date >= from);
    if (to)   docs = docs.filter(d => d.date <= to);
    docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cxc
router.post('/', async (req, res) => {
  try {
    const number = await nextNumber();
    const doc = { ...req.body, number, status: req.body.status || 'pendiente', paid_amount: 0, created_at: new Date().toISOString() };
    res.json(await cxcDb.insert(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cxc/:id
router.put('/:id', async (req, res) => {
  try {
    await cxcDb.update({ _id: req.params.id }, { $set: req.body });
    res.json(await cxcDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/cxc/:id/pay
router.patch('/:id/pay', async (req, res) => {
  try {
    const doc = await cxcDb.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    const total  = parseFloat(doc.amount) || 0;
    const paid   = parseFloat(req.body.paid_amount) ?? total;
    const status = paid >= total ? 'pagada' : 'parcial';
    await cxcDb.update({ _id: req.params.id }, { $set: { paid_amount: paid, paid_date: req.body.paid_date || today(), payment_method: req.body.payment_method || '', status } });
    res.json(await cxcDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cxc/:id
router.delete('/:id', async (req, res) => {
  try {
    await cxcDb.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
