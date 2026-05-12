const express = require('express');
const router  = express.Router();
const { configDb } = require('../db/database');
const { initDeviceFlow, pollForToken, refreshAccessToken } = require('../services/outlookOAuth');

async function getConfig(key) {
  const row = await configDb.findOne({ key });
  return row ? row.value : null;
}
async function setConfig(key, value) {
  const existing = await configDb.findOne({ key });
  if (existing) await configDb.update({ key }, { $set: { value: String(value) } });
  else           await configDb.insert({ key, value: String(value) });
}

// POST /api/email/outlook/init  — start device code flow
router.post('/outlook/init', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'Se requiere el Client ID de Azure' });

    const flow = await initDeviceFlow(clientId);
    // store device_code + client_id temporarily
    await setConfig('outlook_client_id',  clientId);
    await setConfig('outlook_device_code', flow.device_code);

    res.json({
      user_code:        flow.user_code,
      verification_uri: flow.verification_uri,
      message:          flow.message,
      expires_in:       flow.expires_in,
      interval:         flow.interval || 5,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/outlook/poll  — check if user authorized
router.post('/outlook/poll', async (req, res) => {
  try {
    const clientId   = await getConfig('outlook_client_id');
    const deviceCode = await getConfig('outlook_device_code');
    if (!clientId || !deviceCode) {
      return res.status(400).json({ error: 'No hay flujo de autorización activo' });
    }

    const result = await pollForToken(clientId, deviceCode);

    if (result.error === 'authorization_pending') {
      return res.json({ status: 'pending' });
    }
    if (result.error === 'expired_token') {
      return res.json({ status: 'expired' });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error_description || result.error });
    }

    // Success — store tokens
    await setConfig('outlook_access_token',  result.access_token);
    await setConfig('outlook_refresh_token', result.refresh_token || '');
    await setConfig('outlook_token_expiry',  String(Date.now() + (result.expires_in || 3600) * 1000));

    res.json({ status: 'authorized', email: result.id_token ? parseEmail(result.id_token) : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/outlook/status  — check if we have a valid token
router.get('/outlook/status', async (req, res) => {
  try {
    const accessToken  = await getConfig('outlook_access_token');
    const refreshToken = await getConfig('outlook_refresh_token');
    const expiry       = parseInt(await getConfig('outlook_token_expiry') || '0', 10);
    const clientId     = await getConfig('outlook_client_id');

    if (!accessToken && !refreshToken) {
      return res.json({ connected: false });
    }

    // Try to refresh if expired
    if (expiry && Date.now() > expiry - 60000 && refreshToken && clientId) {
      try {
        const refreshed = await refreshAccessToken(clientId, refreshToken);
        await setConfig('outlook_access_token', refreshed.access_token);
        if (refreshed.refresh_token) await setConfig('outlook_refresh_token', refreshed.refresh_token);
        await setConfig('outlook_token_expiry', String(Date.now() + (refreshed.expires_in || 3600) * 1000));
        return res.json({ connected: true, token_refreshed: true });
      } catch {
        return res.json({ connected: false, expired: true });
      }
    }

    res.json({ connected: !!accessToken, expiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/email/outlook/disconnect
router.delete('/outlook/disconnect', async (req, res) => {
  try {
    for (const key of ['outlook_access_token','outlook_refresh_token','outlook_token_expiry','outlook_device_code']) {
      await configDb.remove({ key });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseEmail(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.preferred_username || payload.email || '';
  } catch { return ''; }
}

module.exports = router;
