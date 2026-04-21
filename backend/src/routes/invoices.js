const express = require('express');
const router = express.Router();
const { invoicesDb, configDb } = require('../db/database');
const { numberToWords } = require('../services/numberToWords');

async function getConfig(key) {
  const row = await configDb.findOne({ key });
  return row ? row.value : null;
}

async function setConfig(key, value) {
  const existing = await configDb.findOne({ key });
  if (existing) {
    await configDb.update({ key }, { $set: { value: String(value) } });
  } else {
    await configDb.insert({ key, value: String(value) });
  }
}

function parseItems(row) {
  return {
    ...row,
    id: row._id,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    tax_included: row.tax_included === 1 || row.tax_included === true,
  };
}

function calcTotalsBackend(items, taxIncluded, ve, se, desc) {
  const rawSum = items.reduce(
    (acc, item) => acc + (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0),
    0
  );
  let subtotalGravado, isv, total;
  if (!taxIncluded) {
    subtotalGravado = rawSum - ve - se - desc;
    const totalGravado = subtotalGravado / 0.85;
    isv   = totalGravado - subtotalGravado;
    total = ve + se + totalGravado;
  } else {
    const rawGravado = rawSum - ve - se - desc;
    subtotalGravado  = rawGravado / 1.15;
    isv   = rawGravado - subtotalGravado;
    total = ve + se + rawGravado;
  }
  return {
    subtotalGravado: Math.round(subtotalGravado * 100) / 100,
    isv:             Math.round(isv * 100) / 100,
    total:           Math.round(total * 100) / 100,
  };
}

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { doc_type, from, to } = req.query;
    const query = {};
    if (doc_type) query.doc_type = doc_type;
    let rows = await invoicesDb.find(query).sort({ created_at: -1 });
    if (from) rows = rows.filter(r => r.date >= from);
    if (to)   rows = rows.filter(r => r.date <= to);
    res.json(rows.map(parseItems));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  try {
    const {
      date, clientName, clientAddress = '', clientRtn = '',
      items = [], taxIncluded,
      ventaExonerada = 0, subtotalExento = 0, descuentos = 0,
      noOcExenta = '', noRegistroExonerado = '', noRegistroSag = '',
      docType = 'factura',
    } = req.body;

    if (!date || !clientName || !items.length) {
      return res.status(400).json({ error: 'Faltan campos requeridos: fecha, cliente, artículos' });
    }
    if (taxIncluded === undefined || taxIncluded === null) {
      return res.status(400).json({ error: 'Debe seleccionar el tipo de ISV' });
    }

    const ve   = parseFloat(ventaExonerada) || 0;
    const se   = parseFloat(subtotalExento) || 0;
    const desc = parseFloat(descuentos) || 0;

    const { subtotalGravado, isv, total } = calcTotalsBackend(items, taxIncluded, ve, se, desc);
    const sumaEnLetras = numberToWords(total);

    const isCotizacion = docType === 'cotizacion';
    const prefixKey = isCotizacion ? 'cotizacion_prefix'   : 'invoice_prefix';
    const seqKey    = isCotizacion ? 'cotizacion_sequence' : 'invoice_sequence';
    const prefix    = (await getConfig(prefixKey)) || (isCotizacion ? 'COT' : '000-001-01');
    const seq       = parseInt((await getConfig(seqKey)) || '1', 10);
    const invoiceNumber = isCotizacion
      ? `${prefix}-${String(seq).padStart(6, '0')}`
      : `${prefix}-${String(seq).padStart(8, '0')}`;

    const doc = {
      invoice_number:        invoiceNumber,
      doc_type:              docType,
      date,
      client_name:           clientName,
      client_address:        clientAddress,
      client_rtn:            clientRtn,
      items:                 JSON.stringify(items),
      tax_included:          taxIncluded ? 1 : 0,
      venta_exonerada:       ve,
      subtotal_exento:       se,
      descuentos:            desc,
      subtotal_gravado:      subtotalGravado,
      isv,
      total,
      suma_en_letras:        sumaEnLetras,
      no_oc_exenta:          noOcExenta,
      no_registro_exonerado: noRegistroExonerado,
      no_registro_sag:       noRegistroSag,
      status:                isCotizacion ? 'pendiente' : 'emitida',
      created_at:            new Date().toISOString(),
    };

    const inserted = await invoicesDb.insert(doc);
    await setConfig(seqKey, String(seq + 1));

    res.status(201).json(parseItems(inserted));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear documento' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await invoicesDb.findOne({ _id: req.params.id });
    if (!row) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(parseItems(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// PUT /api/invoices/:id — edit cotizacion (only if not 'facturada')
router.put('/:id', async (req, res) => {
  try {
    const row = await invoicesDb.findOne({ _id: req.params.id });
    if (!row) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (row.doc_type !== 'cotizacion') return res.status(400).json({ error: 'Solo se pueden editar cotizaciones' });
    if (row.status === 'facturada') return res.status(400).json({ error: 'No se puede editar una cotización ya facturada' });

    const {
      date, clientName, clientAddress = '', clientRtn = '',
      items = [], taxIncluded,
      ventaExonerada = 0, subtotalExento = 0, descuentos = 0,
      noOcExenta = '', noRegistroExonerado = '', noRegistroSag = '',
    } = req.body;

    if (!date || !clientName || !items.length) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (taxIncluded === undefined || taxIncluded === null) {
      return res.status(400).json({ error: 'Debe seleccionar el tipo de ISV' });
    }

    const ve   = parseFloat(ventaExonerada) || 0;
    const se   = parseFloat(subtotalExento) || 0;
    const desc = parseFloat(descuentos) || 0;

    const { subtotalGravado, isv, total } = calcTotalsBackend(items, taxIncluded, ve, se, desc);
    const sumaEnLetras = numberToWords(total);

    const updates = {
      date,
      client_name:           clientName,
      client_address:        clientAddress,
      client_rtn:            clientRtn,
      items:                 JSON.stringify(items),
      tax_included:          taxIncluded ? 1 : 0,
      venta_exonerada:       ve,
      subtotal_exento:       se,
      descuentos:            desc,
      subtotal_gravado:      subtotalGravado,
      isv,
      total,
      suma_en_letras:        sumaEnLetras,
      no_oc_exenta:          noOcExenta,
      no_registro_exonerado: noRegistroExonerado,
      no_registro_sag:       noRegistroSag,
    };

    await invoicesDb.update({ _id: req.params.id }, { $set: updates });
    const updated = await invoicesDb.findOne({ _id: req.params.id });
    res.json(parseItems(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// PATCH /api/invoices/:id/status — change status of cotizacion
router.patch('/:id/status', async (req, res) => {
  try {
    const row = await invoicesDb.findOne({ _id: req.params.id });
    if (!row) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (row.doc_type !== 'cotizacion') return res.status(400).json({ error: 'Solo cotizaciones pueden cambiar status así' });

    const { status } = req.body;
    const allowed = ['aceptada', 'rechazada'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status no válido. Valores permitidos: ${allowed.join(', ')}` });
    }

    await invoicesDb.update({ _id: req.params.id }, { $set: { status } });
    const updated = await invoicesDb.findOne({ _id: req.params.id });
    res.json(parseItems(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar status' });
  }
});

// POST /api/invoices/:id/convert — convert cotizacion to factura
router.post('/:id/convert', async (req, res) => {
  try {
    const cot = await invoicesDb.findOne({ _id: req.params.id });
    if (!cot) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (cot.doc_type !== 'cotizacion') return res.status(400).json({ error: 'Solo se pueden convertir cotizaciones' });
    if (cot.status === 'facturada') return res.status(400).json({ error: 'Esta cotización ya fue convertida a factura' });

    // Get new factura number
    const prefixKey = 'invoice_prefix';
    const seqKey    = 'invoice_sequence';
    const prefix    = (await getConfig(prefixKey)) || '000-001-01';
    const seq       = parseInt((await getConfig(seqKey)) || '1', 10);
    const newInvoiceNumber = `${prefix}-${String(seq).padStart(8, '0')}`;

    // Spread cotizacion but exclude cotizacion-specific fields
    const { _id, invoice_number, doc_type, status, created_at, converted_invoice_id, converted_invoice_number, from_cotizacion_id, from_cotizacion_number, ...rest } = cot;

    const facturaDoc = {
      ...rest,
      invoice_number: newInvoiceNumber,
      doc_type: 'factura',
      from_cotizacion_id: cot._id,
      from_cotizacion_number: cot.invoice_number,
      status: 'emitida',
      created_at: new Date().toISOString(),
    };

    const inserted = await invoicesDb.insert(facturaDoc);
    await setConfig(seqKey, String(seq + 1));

    // Update cotizacion: mark as facturada
    await invoicesDb.update(
      { _id: cot._id },
      { $set: { status: 'facturada', converted_invoice_id: inserted._id, converted_invoice_number: newInvoiceNumber } }
    );

    res.status(201).json(parseItems(inserted));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al convertir cotización a factura' });
  }
});

// DELETE /api/invoices/:id — soft delete (anular)
router.delete('/:id', async (req, res) => {
  try {
    const row = await invoicesDb.findOne({ _id: req.params.id });
    if (!row) return res.status(404).json({ error: 'Documento no encontrado' });
    await invoicesDb.update({ _id: req.params.id }, { $set: { status: 'anulada' } });
    const updated = await invoicesDb.findOne({ _id: req.params.id });
    res.json({ success: true, invoice: parseItems(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al anular documento' });
  }
});

module.exports = router;
