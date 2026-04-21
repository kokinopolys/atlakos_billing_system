const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/config',   requireAuth, require('./routes/config'));
app.use('/api/invoices', requireAuth, require('./routes/invoices'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Facturación backend running on http://localhost:${PORT}`);
});

module.exports = app;
