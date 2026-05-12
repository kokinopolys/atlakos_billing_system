const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { sendMailViaGraph, refreshAccessToken } = require('./outlookOAuth');
const { configDb } = require('../db/database');

async function getStoredConfig(key) {
  const row = await configDb.findOne({ key });
  return row ? row.value : null;
}
async function setStoredConfig(key, value) {
  const existing = await configDb.findOne({ key });
  if (existing) await configDb.update({ key }, { $set: { value: String(value) } });
  else           await configDb.insert({ key, value: String(value) });
}

function generateApprovalToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getTransporter(emailConfig) {
  const { provider, host, port, secure, user, pass } = emailConfig;

  if (provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  if (provider === 'outlook' || provider === 'hotmail') {
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { ciphers: 'SSLv3' },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  if (provider === 'yahoo') {
    return nodemailer.createTransport({
      service: 'yahoo',
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  if (provider === 'resend') {
    // Use HTTP API — Render (and most cloud hosts) block outbound SMTP ports
    return {
      sendMail: async ({ from, to, subject, html }) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pass}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to, subject, html }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.name || `Resend error ${response.status}`);
        return data;
      },
    };
  }
  // Custom SMTP — add timeout to avoid hanging on blocked ports
  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: parseInt(port) || 587,
    secure: secure === true || secure === 'true',
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

function buildApprovalEmailHtml({ cotizacion, companyName, approveUrl, rejectUrl, viewUrl }) {
  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const items = (typeof cotizacion.items === 'string' ? JSON.parse(cotizacion.items) : cotizacion.items) || [];

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.description || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty || 0}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">L. ${fmt(item.unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">L. ${fmt((item.qty || 0) * (item.unitPrice || 0))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Cotización ${cotizacion.invoice_number}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:680px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1e40af;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">${companyName}</h1>
      <p style="margin:6px 0 0;color:#93c5fd;font-size:14px;">Cotización de Servicios Tecnológicos</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;">Estimado(a) <strong>${cotizacion.client_company || cotizacion.client_name}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;">Adjunto encontrará la siguiente cotización de servicios para su revisión y aprobación:</p>

      <!-- Quote Info -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#6b7280;font-size:13px;">Número:</span>
          <strong style="color:#111827;font-size:13px;">${cotizacion.invoice_number}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#6b7280;font-size:13px;">Fecha:</span>
          <span style="color:#374151;font-size:13px;">${cotizacion.date}</span>
        </div>
        ${cotizacion.client_rtn ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#6b7280;font-size:13px;">RTN:</span>
          <span style="color:#374151;font-size:13px;">${cotizacion.client_rtn}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#6b7280;font-size:13px;">Total:</span>
          <strong style="color:#1e40af;font-size:16px;">L. ${fmt(cotizacion.total)}</strong>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Descripción</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;">Qty</th>
            <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">Precio Unit.</th>
            <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top:16px;border-top:2px solid #e5e7eb;padding-top:12px;text-align:right;">
        <div style="margin-bottom:4px;color:#6b7280;font-size:13px;">Subtotal: <strong>L. ${fmt(cotizacion.subtotal_gravado)}</strong></div>
        <div style="margin-bottom:4px;color:#6b7280;font-size:13px;">ISV (15%): <strong>L. ${fmt(cotizacion.isv)}</strong></div>
        <div style="color:#1e40af;font-size:17px;font-weight:bold;">Total: L. ${fmt(cotizacion.total)}</div>
      </div>

      <!-- View full document -->
      ${viewUrl ? `
      <div style="margin:24px 0;text-align:center;">
        <a href="${viewUrl}"
           style="display:inline-block;padding:12px 28px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
          📄 Ver Cotización Completa / Imprimir PDF
        </a>
      </div>` : ''}

      <!-- CTA Buttons -->
      <div style="margin:24px 0;text-align:center;">
        <p style="color:#374151;font-size:14px;margin-bottom:20px;">Por favor, indique si desea <strong>aprobar</strong> o <strong>rechazar</strong> esta cotización:</p>
        <a href="${approveUrl}"
           style="display:inline-block;padding:14px 32px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;margin:0 8px;">
          ✓ Aprobar Cotización
        </a>
        <a href="${rejectUrl}"
           style="display:inline-block;padding:14px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;margin:0 8px;">
          ✗ Rechazar Cotización
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;">Este enlace es válido por 7 días. Si tiene preguntas, contáctenos en respuesta a este correo.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${companyName} · Servicios Tecnológicos</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendCotizacionEmail({ emailConfig, cotizacion, companyName, clientEmail, approvalToken, baseUrl }) {
  const approveUrl = `${baseUrl}/cotizacion-respuesta/${approvalToken}?action=approve`;
  const rejectUrl  = `${baseUrl}/cotizacion-respuesta/${approvalToken}?action=reject`;
  const viewUrl    = `${baseUrl}/cotizacion-respuesta/${approvalToken}`;
  const html = buildApprovalEmailHtml({ cotizacion, companyName, approveUrl, rejectUrl, viewUrl });
  const subject = `Cotización ${cotizacion.invoice_number} - ${companyName}`;

  // Outlook personal via Microsoft Graph API
  if (emailConfig.provider === 'outlook_oauth2') {
    let accessToken = await getStoredConfig('outlook_access_token');
    const refreshToken = await getStoredConfig('outlook_refresh_token');
    const expiry = parseInt(await getStoredConfig('outlook_token_expiry') || '0', 10);
    const clientId = emailConfig.clientId || await getStoredConfig('outlook_client_id');

    if (!accessToken && !refreshToken) {
      throw new Error('No hay sesión de Outlook activa. Autoriza la cuenta primero en Configuración.');
    }

    // Refresh token if expired
    if ((!accessToken || (expiry && Date.now() > expiry - 60000)) && refreshToken && clientId) {
      const refreshed = await refreshAccessToken(clientId, refreshToken);
      accessToken = refreshed.access_token;
      await setStoredConfig('outlook_access_token', accessToken);
      if (refreshed.refresh_token) await setStoredConfig('outlook_refresh_token', refreshed.refresh_token);
      await setStoredConfig('outlook_token_expiry', String(Date.now() + (refreshed.expires_in || 3600) * 1000));
    }

    await sendMailViaGraph(accessToken, emailConfig.user || '', clientEmail, subject, html);
    return;
  }

  // Standard SMTP (Gmail, Yahoo, custom)
  const transporter = getTransporter(emailConfig);
  const mailOptions = {
    from: `"${companyName}" <${emailConfig.user}>`,
    to: clientEmail,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
}

function buildVoucherHtml({ voucher, companyName, companyAddress }) {
  const fmt = n => parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ingresos    = (voucher.concepts || []).filter(c => c.type === 'ingreso');
  const deducciones = (voucher.concepts || []).filter(c => c.type === 'deduccion');

  const ingresoRows = ingresos.map(c => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${c.description}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;">L. ${fmt(c.amount)}</td>
    </tr>`).join('');

  const deduccionRows = deducciones.map(c => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${c.description}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#dc2626;">L. ${fmt(c.amount)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Comprobante de Pago</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:680px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#1e40af;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:bold;">${companyName}</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">${companyAddress || ''}</p>
    <div style="margin-top:16px;"><span style="background:rgba(255,255,255,0.2);color:#fff;padding:6px 20px;border-radius:20px;font-size:14px;font-weight:bold;letter-spacing:1px;">COMPROBANTE DE PAGO</span></div>
    <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">No. ${voucher.number || 'VOC-000000'}</p>
  </div>
  <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
    <h2 style="margin:0 0 14px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Información del Empleado</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#6b7280;width:40%;">Nombre:</td><td style="padding:4px 0;color:#111827;font-weight:600;">${voucher.employee_name || ''}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Identidad:</td><td style="padding:4px 0;color:#111827;">${voucher.employee_cedula || ''}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Código:</td><td style="padding:4px 0;color:#111827;">${voucher.employee_code || ''}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Cargo:</td><td style="padding:4px 0;color:#111827;">${voucher.employee_cargo || ''}</td></tr>
      ${voucher.employee_departamento ? `<tr><td style="padding:4px 0;color:#6b7280;">Departamento:</td><td style="padding:4px 0;color:#111827;">${voucher.employee_departamento}</td></tr>` : ''}
    </table>
  </div>
  <div style="padding:16px 32px;background:#fafafa;border-bottom:1px solid #e5e7eb;">
    <h2 style="margin:0 0 10px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Período de Pago</h2>
    <table style="font-size:14px;"><tr>
      <td style="padding-right:32px;color:#6b7280;">Desde: <strong style="color:#111827;">${voucher.period_from || ''}</strong></td>
      <td style="padding-right:32px;color:#6b7280;">Hasta: <strong style="color:#111827;">${voucher.period_to || ''}</strong></td>
      <td style="color:#6b7280;">Fecha de Pago: <strong style="color:#111827;">${voucher.pay_date || ''}</strong></td>
    </tr></table>
  </div>
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;"><tr style="vertical-align:top;">
      <td style="width:50%;padding-right:16px;">
        <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;">Ingresos</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
          <thead><tr style="background:#f0fdf4;">
            <th style="padding:8px 12px;text-align:left;color:#059669;font-size:11px;">Concepto</th>
            <th style="padding:8px 12px;text-align:right;color:#059669;font-size:11px;">Monto</th>
          </tr></thead>
          <tbody>${ingresoRows || '<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af;font-size:12px;">—</td></tr>'}</tbody>
          <tfoot><tr style="background:#f0fdf4;">
            <td style="padding:8px 12px;font-weight:700;color:#059669;font-size:13px;">Total Ingresos</td>
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:#059669;font-size:13px;">L. ${fmt(voucher.total_ingresos)}</td>
          </tr></tfoot>
        </table>
      </td>
      <td style="width:50%;padding-left:16px;">
        <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;">Deducciones</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
          <thead><tr style="background:#fef2f2;">
            <th style="padding:8px 12px;text-align:left;color:#dc2626;font-size:11px;">Concepto</th>
            <th style="padding:8px 12px;text-align:right;color:#dc2626;font-size:11px;">Monto</th>
          </tr></thead>
          <tbody>${deduccionRows || '<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af;font-size:12px;">—</td></tr>'}</tbody>
          <tfoot><tr style="background:#fef2f2;">
            <td style="padding:8px 12px;font-weight:700;color:#dc2626;font-size:13px;">Total Deducciones</td>
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:#dc2626;font-size:13px;">L. ${fmt(voucher.total_deducciones)}</td>
          </tr></tfoot>
        </table>
      </td>
    </tr></table>
    <div style="margin-top:24px;background:#1e40af;border-radius:10px;padding:20px 24px;text-align:center;">
      <p style="margin:0;color:#bfdbfe;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">NETO A PAGAR</p>
      <p style="margin:8px 0 0;color:#fff;font-size:34px;font-weight:900;">L. ${fmt(voucher.neto)}</p>
    </div>
    <table style="width:100%;margin-top:40px;"><tr>
      <td style="width:50%;text-align:center;padding:0 20px;">
        <div style="border-top:2px solid #d1d5db;padding-top:8px;">
          <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">Firma del Empleado</p>
          <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">${voucher.employee_name || ''}</p>
        </div>
      </td>
      <td style="width:50%;text-align:center;padding:0 20px;">
        <div style="border-top:2px solid #d1d5db;padding-top:8px;">
          <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">Recursos Humanos</p>
          <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">${companyName}</p>
        </div>
      </td>
    </tr></table>
  </div>
  <div style="background:#fafafa;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">${companyName} · Documento confidencial — solo para el empleado</p>
  </div>
</div>
</body></html>`;
}

async function sendVoucherEmail({ voucher, employeeEmail, companyName, emailConfig: inline }) {
  const provider = inline?.provider || await getStoredConfig('smtp_provider') || 'gmail';
  const user     = inline?.user     || await getStoredConfig('smtp_user') || '';
  const pass     = inline?.pass     || await getStoredConfig('smtp_pass') || '';
  const companyAddress = await getStoredConfig('company_address') || '';
  if (!user || !pass) throw new Error('No hay credenciales SMTP configuradas. Guarda el correo y contraseña en Configuración.');
  const transporter = getTransporter({ provider, user, pass });
  const html = buildVoucherHtml({ voucher, companyName, companyAddress });
  await transporter.sendMail({
    from: `"${companyName}" <${user}>`,
    to: employeeEmail,
    subject: `Comprobante de Pago — ${voucher.employee_name} — Período ${voucher.period_from} al ${voucher.period_to}`,
    html,
  });
}

module.exports = { generateApprovalToken, sendCotizacionEmail, sendVoucherEmail };
