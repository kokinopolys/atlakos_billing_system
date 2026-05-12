const express = require('express');
const router = express.Router();
const { invoicesDb, configDb } = require('../db/database');
const { nowHN } = require('../utils/time');

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

// GET /api/cotizacion-respuesta/:token
router.get('/:token', async (req, res) => {
  try {
    const cot = await invoicesDb.findOne({ approval_token: req.params.token });
    if (!cot) return res.status(404).json({ error: 'Cotización no encontrada o enlace inválido' });
    if (cot.approval_token_expires && new Date(cot.approval_token_expires) < new Date()) {
      return res.status(410).json({ error: 'Este enlace ha expirado' });
    }
    // Include company config for rendering the full template
    const allConfig = await configDb.find({});
    const config = {};
    for (const row of allConfig) {
      if (!['smtp_pass', 'smtp_user', 'outlook_access_token', 'outlook_refresh_token', 'outlook_device_code'].includes(row.key)) {
        config[row.key] = row.value;
      }
    }
    res.json({ ...parseItems(cot), _config: config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// POST /api/cotizacion-respuesta/:token
router.post('/:token', async (req, res) => {
  try {
    const cot = await invoicesDb.findOne({ approval_token: req.params.token });
    if (!cot) return res.status(404).json({ error: 'Cotización no encontrada o enlace inválido' });
    if (cot.approval_token_expires && new Date(cot.approval_token_expires) < new Date()) {
      return res.status(410).json({ error: 'Este enlace ha expirado' });
    }
    if (cot.status === 'facturada' || cot.status === 'anulada') {
      return res.status(400).json({ error: 'Esta cotización ya no puede modificarse' });
    }

    const { action, rejection_reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    if (action === 'reject') {
      await invoicesDb.update(
        { _id: cot._id },
        { $set: { status: 'rechazada', rejection_reason: rejection_reason || '', approval_token: null } }
      );
      return res.json({ success: true, status: 'rechazada' });
    }

    // Approve: auto-convert to factura
    const prefix = (await getConfig('invoice_prefix')) || '000-001-01';
    const seq    = parseInt((await getConfig('invoice_sequence')) || '1', 10);
    const newInvoiceNumber = `${prefix}-${String(seq).padStart(8, '0')}`;

    const { _id, invoice_number, doc_type, status, created_at, approval_token, approval_token_expires, ...rest } = cot;

    const facturaDoc = {
      ...rest,
      invoice_number: newInvoiceNumber,
      doc_type: 'factura',
      from_cotizacion_id: cot._id,
      from_cotizacion_number: cot.invoice_number,
      status: 'emitida',
      created_at: nowHN(),
    };

    const inserted = await invoicesDb.insert(facturaDoc);
    await setConfig('invoice_sequence', String(seq + 1));
    await invoicesDb.update(
      { _id: cot._id },
      { $set: { status: 'facturada', converted_invoice_id: inserted._id, converted_invoice_number: newInvoiceNumber, approval_token: null, approved_at: nowHN() } }
    );

    res.json({ success: true, status: 'facturada', factura_id: inserted._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar respuesta' });
  }
});

module.exports = router;
