const express = require('express');
const { empleadosDb, vouchersDb, configDb } = require('../db/database');
const { sendVoucherEmail } = require('../services/emailService');
const router = express.Router();

async function nextVoucherNumber() {
  const seq = await configDb.findOne({ key: 'voucher_sequence' });
  const n = seq ? parseInt(seq.value) + 1 : 1;
  if (seq) await configDb.update({ key: 'voucher_sequence' }, { $set: { value: String(n) } });
  else     await configDb.insert({ key: 'voucher_sequence', value: String(n) });
  return 'VOC-' + String(n).padStart(6, '0');
}

// POST /api/empleados/vouchers/:id/send-email  — literal route BEFORE /:id
router.post('/vouchers/:id/send-email', async (req, res) => {
  try {
    const voucher = await vouchersDb.findOne({ _id: req.params.id });
    if (!voucher) return res.status(404).json({ error: 'Voucher no encontrado' });
    const employee = await empleadosDb.findOne({ _id: voucher.employee_id });
    const email = employee?.email || req.body.email;
    if (!email) return res.status(400).json({ error: 'El empleado no tiene correo registrado' });

    const cfgName = await configDb.findOne({ key: 'company_name' });
    const companyName = cfgName?.value || 'Empresa';

    await sendVoucherEmail({ voucher, employeeEmail: email, companyName, emailConfig: req.body.emailConfig });
    await vouchersDb.update({ _id: req.params.id }, { $set: { email_sent: true, email_sent_at: new Date().toISOString() } });
    res.json(await vouchersDb.findOne({ _id: req.params.id }));
  } catch (err) {
    console.error('sendVoucherEmail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/empleados/vouchers/:id
router.put('/vouchers/:id', async (req, res) => {
  try {
    const { period_from, period_to, pay_date, concepts, total_ingresos, total_deducciones, neto } = req.body;
    await vouchersDb.update({ _id: req.params.id }, { $set: { period_from, period_to, pay_date, concepts, total_ingresos, total_deducciones, neto } });
    res.json(await vouchersDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/empleados/vouchers/:id
router.delete('/vouchers/:id', async (req, res) => {
  try {
    await vouchersDb.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/empleados/test-email  — literal route BEFORE /:id
router.post('/test-email', async (req, res) => {
  try {
    const { sendVoucherEmail } = require('../services/emailService');
    const cfgName = await configDb.findOne({ key: 'company_name' });
    const companyName = cfgName?.value || 'Prueba';
    const toEmail = req.body.to;
    if (!toEmail) return res.status(400).json({ error: 'Falta el campo "to"' });
    await sendVoucherEmail({
      voucher: {
        number: 'TEST-000001', employee_name: 'Prueba de Correo', employee_cedula: '0000-0000-00000',
        employee_code: 'TEST', employee_cargo: 'Sistema', period_from: '2026-05-01', period_to: '2026-05-31',
        pay_date: '2026-05-31', concepts: [{ type: 'ingreso', description: 'Prueba', amount: 1 }],
        total_ingresos: 1, total_deducciones: 0, neto: 1,
      },
      employeeEmail: toEmail, companyName,
      emailConfig: req.body.emailConfig,
    });
    res.json({ success: true, message: 'Correo de prueba enviado a ' + toEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/empleados
router.get('/', async (req, res) => {
  try {
    const docs = await empleadosDb.find({});
    docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/empleados
router.post('/', async (req, res) => {
  try {
    const doc = { ...req.body, active: true, created_at: new Date().toISOString() };
    res.json(await empleadosDb.insert(doc));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/empleados/:id
router.put('/:id', async (req, res) => {
  try {
    await empleadosDb.update({ _id: req.params.id }, { $set: req.body });
    res.json(await empleadosDb.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/empleados/:id
router.delete('/:id', async (req, res) => {
  try {
    await empleadosDb.remove({ _id: req.params.id });
    await vouchersDb.remove({ employee_id: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/empleados/:id/vouchers
router.get('/:id/vouchers', async (req, res) => {
  try {
    const docs = await vouchersDb.find({ employee_id: req.params.id });
    docs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/empleados/:id/vouchers
router.post('/:id/vouchers', async (req, res) => {
  try {
    const employee = await empleadosDb.findOne({ _id: req.params.id });
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
    const number = await nextVoucherNumber();
    const voucher = {
      ...req.body,
      number,
      employee_id:           req.params.id,
      employee_name:         employee.name,
      employee_cedula:       employee.cedula,
      employee_code:         employee.code,
      employee_cargo:        employee.cargo,
      employee_departamento: employee.departamento,
      email_sent: false,
      created_at: new Date().toISOString(),
    };
    res.json(await vouchersDb.insert(voucher));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
