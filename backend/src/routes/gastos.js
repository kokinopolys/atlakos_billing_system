const express = require('express');
const router = express.Router();
const { gastosDb } = require('../db/database');
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
    const { description, monto, categoria, date, notes } = req.body;
    if (!description || !monto || !date) {
      return res.status(400).json({ error: 'Descripción, monto y fecha son requeridos' });
    }
    const doc = {
      description: description.trim(),
      monto: parseFloat(monto) || 0,
      categoria: (categoria || 'Otros').trim(),
      date,
      notes: (notes || '').trim(),
      created_at: nowHN(),
    };
    const inserted = await gastosDb.insert(doc);
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

    const { description, monto, categoria, date, notes } = req.body;
    const updates = {
      description: (description || '').trim(),
      monto: parseFloat(monto) || 0,
      categoria: (categoria || 'Otros').trim(),
      date,
      notes: (notes || '').trim(),
      updated_at: nowHN(),
    };
    await gastosDb.update({ _id: req.params.id }, { $set: updates });
    const updated = await gastosDb.findOne({ _id: req.params.id });
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
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

module.exports = router;
