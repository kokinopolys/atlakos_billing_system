const express = require('express');
const router = express.Router();
const { clientesDb, invoicesDb } = require('../db/database');
const { nowHN } = require('../utils/time');

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let clientes = await clientesDb.find({}).sort({ name: 1 });
    if (search) {
      const s = search.toLowerCase();
      clientes = clientes.filter(c =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.rtn || '').toLowerCase().includes(s) ||
        (c.company || '').toLowerCase().includes(s)
      );
    }
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clientes/report
router.get('/report', async (req, res) => {
  try {
    const clientes = await clientesDb.find({}).sort({ name: 1 });
    const allDocs = await invoicesDb.find({});
    const allInvoices     = allDocs.filter(d => d.doc_type === 'factura'    && d.status === 'emitida');
    const allCotizaciones = allDocs.filter(d => d.doc_type === 'cotizacion');

    const report = clientes.map(c => {
      const matches = (d) => d.client_id === c._id || d.client_name === c.name;
      const facturas     = allInvoices.filter(matches);
      const cotizaciones = allCotizaciones.filter(matches);
      const totalFacturado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
      return {
        ...c,
        total_facturas: facturas.length,
        total_cotizaciones: cotizaciones.length,
        total_facturado: totalFacturado,
      };
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const c = await clientesDb.findOne({ _id: req.params.id });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// GET /api/clientes/:id/documentos
router.get('/:id/documentos', async (req, res) => {
  try {
    const c = await clientesDb.findOne({ _id: req.params.id });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Match by client_id (new docs) OR client_name (legacy docs without client_id)
    const matches = (doc) =>
      doc.client_id === c._id || doc.client_name === c.name;

    const all = await invoicesDb.find({}).sort({ created_at: -1 });

    const facturas     = all.filter(d => d.doc_type === 'factura'     && matches(d));
    const cotizaciones = all.filter(d => d.doc_type === 'cotizacion'  && matches(d));

    res.json({ facturas, cotizaciones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener documentos del cliente' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, address, rtn, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const doc = {
      name: name.trim(),
      company: (company || '').trim(),
      email: (email || '').trim().toLowerCase(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      rtn: (rtn || '').trim(),
      notes: (notes || '').trim(),
      created_at: nowHN(),
    };

    const inserted = await clientesDb.insert(doc);
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const c = await clientesDb.findOne({ _id: req.params.id });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { name, company, email, phone, address, rtn, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const updates = {
      name: name.trim(),
      company: (company || '').trim(),
      email: (email || '').trim().toLowerCase(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      rtn: (rtn || '').trim(),
      notes: (notes || '').trim(),
      updated_at: nowHN(),
    };

    await clientesDb.update({ _id: req.params.id }, { $set: updates });
    const updated = await clientesDb.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const c = await clientesDb.findOne({ _id: req.params.id });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    await clientesDb.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
