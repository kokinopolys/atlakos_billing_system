require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { requireAuth } = require('./middleware/auth');
const { nowHN } = require('./utils/time');
const { ready } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: nowHN() }));

// All routes are registered after DB is ready so destructured db instances are valid
ready.then(() => {
  app.use('/api/auth',        require('./routes/auth'));
  app.use('/api/cotizacion-respuesta', require('./routes/publicCotizaciones'));
  app.use('/api/email',       requireAuth, require('./routes/emailAuth'));
  app.use('/api/config',      requireAuth, require('./routes/config'));
  app.use('/api/invoices',    requireAuth, require('./routes/invoices'));
  app.use('/api/clientes',    requireAuth, require('./routes/clientes'));
  app.use('/api/servicios',   requireAuth, require('./routes/servicios'));
  app.use('/api/gastos',      requireAuth, require('./routes/gastos'));
  app.use('/api/reportes',    requireAuth, require('./routes/reportes'));
  app.use('/api/finanzas',    requireAuth, require('./routes/finanzas'));
  app.use('/api/cxc',         requireAuth, require('./routes/cxc'));
  app.use('/api/cxp',         requireAuth, require('./routes/cxp'));
  app.use('/api/empleados',   requireAuth, require('./routes/empleados'));
  app.use('/api/admin',       requireAuth, require('./routes/admin'));

  // In production the backend serves the built React app
  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, () => {
    console.log(`Facturación backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
