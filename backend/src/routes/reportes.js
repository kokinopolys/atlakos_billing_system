const express = require('express');
const router = express.Router();
const { invoicesDb } = require('../db/database');

// GET /api/reportes/resumen
router.get('/resumen', async (req, res) => {
  try {
    const { from, to } = req.query;
    let facturas = await invoicesDb.find({ doc_type: 'factura', status: 'emitida' });
    let cotizaciones = await invoicesDb.find({ doc_type: 'cotizacion' });

    if (from) { facturas = facturas.filter(f => f.date >= from); cotizaciones = cotizaciones.filter(c => c.date >= from); }
    if (to)   { facturas = facturas.filter(f => f.date <= to);   cotizaciones = cotizaciones.filter(c => c.date <= to); }

    const totalVentas       = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalISV          = facturas.reduce((sum, f) => sum + (f.isv || 0), 0);
    const totalSubtotal     = facturas.reduce((sum, f) => sum + (f.subtotal_gravado || 0), 0);
    const totalCotizaciones = cotizaciones.length;
    const cotAceptadas      = cotizaciones.filter(c => c.status === 'aceptada' || c.status === 'facturada').length;
    const cotFacturadas     = cotizaciones.filter(c => c.status === 'facturada').length;

    res.json({
      total_facturas:     facturas.length,
      total_ventas:       Math.round(totalVentas * 100) / 100,
      total_isv:          Math.round(totalISV * 100) / 100,
      total_subtotal:     Math.round(totalSubtotal * 100) / 100,
      total_cotizaciones: totalCotizaciones,
      cot_aceptadas:      cotAceptadas,
      cot_facturadas:     cotFacturadas,
      tasa_conversion:    totalCotizaciones > 0
        ? Math.round((cotFacturadas / totalCotizaciones) * 100)
        : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
});

// GET /api/reportes/por-fecha
router.get('/por-fecha', async (req, res) => {
  try {
    const { from, to } = req.query;
    let facturas = await invoicesDb.find({ doc_type: 'factura', status: 'emitida' });
    if (from) facturas = facturas.filter(f => f.date >= from);
    if (to)   facturas = facturas.filter(f => f.date <= to);

    const byDate = {};
    for (const f of facturas) {
      const d = f.date || f.created_at?.slice(0, 10) || 'N/A';
      if (!byDate[d]) byDate[d] = { date: d, count: 0, total: 0 };
      byDate[d].count++;
      byDate[d].total += f.total || 0;
    }

    const result = Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, total: Math.round(d.total * 100) / 100 }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte por fecha' });
  }
});

// GET /api/reportes/por-cliente
router.get('/por-cliente', async (req, res) => {
  try {
    const { from, to } = req.query;
    let facturas = await invoicesDb.find({ doc_type: 'factura', status: 'emitida' });
    if (from) facturas = facturas.filter(f => f.date >= from);
    if (to)   facturas = facturas.filter(f => f.date <= to);

    const byCliente = {};
    for (const f of facturas) {
      const name = f.client_name || 'Desconocido';
      if (!byCliente[name]) byCliente[name] = { client_name: name, count: 0, total: 0 };
      byCliente[name].count++;
      byCliente[name].total += f.total || 0;
    }

    const result = Object.values(byCliente)
      .sort((a, b) => b.total - a.total)
      .map(d => ({ ...d, total: Math.round(d.total * 100) / 100 }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte por cliente' });
  }
});

// GET /api/reportes/por-servicio
router.get('/por-servicio', async (req, res) => {
  try {
    const { from, to } = req.query;
    let facturas = await invoicesDb.find({ doc_type: 'factura', status: 'emitida' });
    if (from) facturas = facturas.filter(f => f.date >= from);
    if (to)   facturas = facturas.filter(f => f.date <= to);

    const byService = {};
    for (const f of facturas) {
      const items = typeof f.items === 'string' ? JSON.parse(f.items) : (f.items || []);
      for (const item of items) {
        const desc = item.description || 'Sin descripción';
        if (!byService[desc]) byService[desc] = { description: desc, qty: 0, total: 0 };
        byService[desc].qty   += parseFloat(item.qty) || 0;
        byService[desc].total += (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
      }
    }

    const result = Object.values(byService)
      .sort((a, b) => b.total - a.total)
      .map(d => ({ ...d, total: Math.round(d.total * 100) / 100 }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte por servicio' });
  }
});

module.exports = router;
