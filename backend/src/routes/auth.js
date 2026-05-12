const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { usersDb } = require('../db/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { nowHN } = require('../utils/time');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await usersDb.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user._id, username: user.username, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/users — list all users (protected)
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await usersDb.find({}).sort({ createdAt: 1 });
    res.json(users.map(u => ({ id: u._id, username: u.username, name: u.name, createdAt: u.createdAt })));
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/auth/users — create user (protected)
router.post('/users', requireAuth, async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const exists = await usersDb.findOne({ username: username.trim() });
    if (exists) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await usersDb.insert({
      username: username.trim(),
      password: hash,
      name: name || username.trim(),
      createdAt: nowHN(),
    });

    res.status(201).json({ id: user._id, username: user.username, name: user.name });
  } catch {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// DELETE /api/auth/users/:id — delete user (protected)
router.delete('/users/:id', requireAuth, async (req, res) => {
  try {
    const user = await usersDb.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user._id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    await usersDb.remove({ _id: req.params.id }, {});
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// PUT /api/auth/users/:id/password — change password (protected)
router.put('/users/:id/password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }
    const hash = await bcrypt.hash(password, 10);
    const updated = await usersDb.update({ _id: req.params.id }, { $set: { password: hash } }, {});
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

module.exports = router;
