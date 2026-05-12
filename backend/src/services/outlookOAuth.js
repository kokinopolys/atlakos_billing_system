const https = require('https');

const TENANT = 'common'; // personal + organizational Microsoft accounts
const SCOPE  = 'https://graph.microsoft.com/Mail.Send offline_access';

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data   = new URLSearchParams(body).toString();
    const opts   = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 1: Get device code
async function initDeviceFlow(clientId) {
  const result = await httpsPost(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`,
    { client_id: clientId, scope: SCOPE }
  );
  if (result.error) throw new Error(result.error_description || result.error);
  return result; // { device_code, user_code, verification_uri, expires_in, interval, message }
}

// Step 2: Poll for token
async function pollForToken(clientId, deviceCode) {
  const result = await httpsPost(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      client_id:   clientId,
      grant_type:  'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
    }
  );
  return result; // access_token, refresh_token, error (authorization_pending | expired_token | etc)
}

// Refresh an existing access token using the refresh token
async function refreshAccessToken(clientId, refreshToken) {
  const result = await httpsPost(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      client_id:     clientId,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      scope:         SCOPE,
    }
  );
  if (result.error) throw new Error(result.error_description || result.error);
  return result; // { access_token, refresh_token, expires_in }
}

// Send email via Microsoft Graph API
async function sendMailViaGraph(accessToken, fromEmail, toEmail, subject, html) {
  const body = JSON.stringify({
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: toEmail } }],
    },
    saveToSentItems: true,
  });

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (response.status === 202 || response.status === 200) return; // success (no body)
  const err = await response.json().catch(() => ({}));
  throw new Error(err?.error?.message || `Graph API error: ${response.status}`);
}

module.exports = { initDeviceFlow, pollForToken, refreshAccessToken, sendMailViaGraph };
