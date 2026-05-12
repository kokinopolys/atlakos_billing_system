const express = require('express');
const router = express.Router();
const { invoicesDb, gastosDb } = require('../db/database');

// GET /api/finanzas/resumen
router.get('/resumen', async (req, res) => {
  try {
    const { from, to } = req.query;

    let facturas = await invoicesDb.find({ doc_type: 'factura', status: 'emitida' });
    let gastos   = await gastosDb.find({});

    if (from) { facturas = facturas.filter(f => f.date >= from); gastos = gastos.filter(g => g.date >= from); }
    if (to)   { facturas = facturas.filter(f => f.date <= to);   gastos = gastos.filter(g => g.date <= to); }

    const totalIngresos = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalGastos   = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const totalISV      = facturas.reduce((sum, f) => sum + (f.isv || 0), 0);
    const utilidad      = totalIngresos - totalGastos;

    // Monthly breakdown
    const byMonth = {};
    for (const f of facturas) {
      const m = (f.date || '').slice(0, 7);
      if (!m) continue;
      if (!byMonth[m]) byMonth[m] = { month: m, ingresos: 0, gastos: 0, utilidad: 0 };
      byMonth[m].ingresos += f.total || 0;
    }
    for (const g of gastos) {
      const m = (g.date || '').slice(0, 7);
      if (!m) continue;
      if (!byMonth[m]) byMonth[m] = { month: m, ingresos: 0, gastos: 0, utilidad: 0 };
      byMonth[m].gastos += g.monto || 0;
    }
    const meses = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        ingresos: Math.round(m.ingresos * 100) / 100,
        gastos:   Math.round(m.gastos   * 100) / 100,
        utilidad: Math.round((m.ingresos - m.gastos) * 100) / 100,
      }));

    res.json({
      total_ingresos:  Math.round(totalIngresos * 100) / 100,
      total_gastos:    Math.round(totalGastos   * 100) / 100,
      total_isv:       Math.round(totalISV       * 100) / 100,
      utilidad_bruta:  Math.round(utilidad        * 100) / 100,
      meses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar resumen financiero' });
  }
});

module.exports = router;
