const express = require('express');
const router = express.Router();
const { serviciosDb } = require('../db/database');
const { nowHN } = require('../utils/time');

// GET /api/servicios
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let items = await serviciosDb.find({}).sort({ name: 1 });
    if (category) items = items.filter(i => i.category === category);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        (i.name || '').toLowerCase().includes(s) ||
        (i.description || '').toLowerCase().includes(s) ||
        (i.category || '').toLowerCase().includes(s)
      );
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// GET /api/servicios/categorias
router.get('/categorias', async (req, res) => {
  try {
    const items = await serviciosDb.find({});
    const cats = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/servicios/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await serviciosDb.findOne({ _id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

// POST /api/servicios
router.post('/', async (req, res) => {
  try {
    const { name, description, category, unit, unit_price, sku, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const doc = {
      name: name.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      unit: (unit || 'servicio').trim(),
      unit_price: parseFloat(unit_price) || 0,
      sku: (sku || '').trim(),
      notes: (notes || '').trim(),
      created_at: nowHN(),
    };

    const inserted = await serviciosDb.insert(doc);
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// PUT /api/servicios/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await serviciosDb.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Servicio no encontrado' });

    const { name, description, category, unit, unit_price, sku, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const updates = {
      name: name.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      unit: (unit || 'servicio').trim(),
      unit_price: parseFloat(unit_price) || 0,
      sku: (sku || '').trim(),
      notes: (notes || '').trim(),
      updated_at: nowHN(),
    };

    await serviciosDb.update({ _id: req.params.id }, { $set: updates });
    const updated = await serviciosDb.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// DELETE /api/servicios/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await serviciosDb.findOne({ _id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Servicio no encontrado' });
    await serviciosDb.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

module.exports = router;
