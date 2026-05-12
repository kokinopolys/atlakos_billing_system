const express = require('express');
const router = express.Router();
const { invoicesDb, configDb, usersDb, clientesDb, serviciosDb, gastosDb, cxcDb, cxpDb, empleadosDb, vouchersDb } = require('../db/database');

// GET /api/admin/export  — full JSON dump of all collections (passwords excluded)
router.get('/export', async (req, res) => {
  try {
    const [invoices, config, users, clientes, servicios, gastos, cxc, cxp, empleados, vouchers] = await Promise.all([
      invoicesDb.find({}),
      configDb.find({}),
      usersDb.find({}),
      clientesDb.find({}),
      serviciosDb.find({}),
      gastosDb.find({}),
      cxcDb.find({}),
      cxpDb.find({}),
      empleadosDb.find({}),
      vouchersDb.find({}),
    ]);

    res.json({
      exported_at: new Date().toISOString(),
      collections: {
        invoices,
        config,
        users: users.map(({ password, ...u }) => u),
        clientes,
        servicios,
        gastos,
        cxc,
        cxp,
        empleados,
        vouchers,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
