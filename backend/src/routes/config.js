const express = require('express');
const router = express.Router();
const { configDb } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const rows = await configDb.find({});
    const config = {};
    for (const row of rows) config[row.key] = row.value;
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

router.put('/', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const existing = await configDb.findOne({ key });
      if (existing) {
        await configDb.update({ key }, { $set: { value: String(value) } });
      } else {
        await configDb.insert({ key, value: String(value) });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

module.exports = router;
