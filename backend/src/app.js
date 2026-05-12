require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');
const { nowHN } = require('./utils/time');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cotizacion-respuesta', require('./routes/publicCotizaciones'));
app.use('/api/email', requireAuth, require('./routes/emailAuth'));

// Protected routes
app.use('/api/config',   requireAuth, require('./routes/config'));
app.use('/api/invoices', requireAuth, require('./routes/invoices'));
app.use('/api/clientes', requireAuth, require('./routes/clientes'));
app.use('/api/servicios', requireAuth, require('./routes/servicios'));
app.use('/api/gastos',     requireAuth, require('./routes/gastos'));
app.use('/api/reportes',   requireAuth, require('./routes/reportes'));
app.use('/api/finanzas',   requireAuth, require('./routes/finanzas'));
app.use('/api/cxc',        requireAuth, require('./routes/cxc'));
app.use('/api/cxp',        requireAuth, require('./routes/cxp'));
app.use('/api/empleados',  requireAuth, require('./routes/empleados'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: nowHN() });
});

app.listen(PORT, () => {
  console.log(`Facturación backend running on http://localhost:${PORT}`);
});

module.exports = app;
