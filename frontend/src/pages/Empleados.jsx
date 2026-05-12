import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'
import * as XLSX from 'xlsx'

async function exportEmpleadosXlsx(empleados) {
  const fmtN = n => parseFloat(n || 0)
  // Fetch all vouchers in parallel
  const allVouchers = await Promise.all(
    empleados.map(e => api.getVouchers(e._id).catch(() => []))
  )

  // Sheet 1: Summary per employee
  const resumen = empleados.map((e, i) => {
    const vs = allVouchers[i]
    return {
      'Código':            e.code || '',
      'Nombre':            e.name || '',
      'Cédula':            e.cedula || '',
      'Cargo':             e.cargo || '',
      'Departamento':      e.departamento || '',
      'Correo':            e.email || '',
      'Salario Base':      fmtN(e.salario_base),
      '# Pagos':           vs.length,
      'Total Ingresos':    fmtN(vs.reduce((s, v) => s + fmtN(v.total_ingresos), 0)),
      'Total Deducciones': fmtN(vs.reduce((s, v) => s + fmtN(v.total_deducciones), 0)),
      'Neto Acumulado':    fmtN(vs.reduce((s, v) => s + fmtN(v.neto), 0)),
    }
  })

  // Sheet 2: Detail per voucher
  const detalle = []
  empleados.forEach((e, i) => {
    allVouchers[i].forEach(v => {
      detalle.push({
        'No. Voucher':       v.number || '',
        'Nombre':            e.name || '',
        'Código':            e.code || '',
        'Cargo':             e.cargo || '',
        'Departamento':      e.departamento || '',
        'Período Desde':     v.period_from || '',
        'Período Hasta':     v.period_to || '',
        'Fecha de Pago':     v.pay_date || '',
        'Total Ingresos':    fmtN(v.total_ingresos),
        'Total Deducciones': fmtN(v.total_deducciones),
        'Neto':              fmtN(v.neto),
        'Email Enviado':     v.email_sent ? 'Sí' : 'No',
      })
    })
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen),  'Resumen por Empleado')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle.length ? detalle : [{}]), 'Detalle de Pagos')
  XLSX.writeFile(wb, `empleados_${new Date().toISOString().slice(0,10)}.xlsx`)
}

const ACCENT = '#2563EB'
const fmt = n => 'L. ' + parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

function openPrint(html) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permite ventanas emergentes para poder imprimir.'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

function buildVoucherPrintHtml(v, companyName, companyAddress) {
  const fmtN = n => 'L. ' + parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const ingresos    = (v.concepts || []).filter(c => c.type === 'ingreso')
  const deducciones = (v.concepts || []).filter(c => c.type === 'deduccion')
  const ingresoRows = ingresos.map(c => `<tr><td style="padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;">${c.description}</td><td style="padding:5px 10px;text-align:right;font-size:12px;">L. ${fmtN(c.amount).replace('L. ','')}</td></tr>`).join('')
  const deducRows   = deducciones.map(c => `<tr><td style="padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;">${c.description}</td><td style="padding:5px 10px;text-align:right;font-size:12px;color:#dc2626;">L. ${fmtN(c.amount).replace('L. ','')}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Voucher ${v.number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#f3f4f6;}
.page{max-width:680px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);}
.header{background:#2563EB;padding:24px 32px;text-align:center;color:#fff;}
.header h1{font-size:18px;margin-bottom:4px;}
.header p{font-size:11px;color:#bfdbfe;}
.badge{display:inline-block;background:rgba(255,255,255,.2);padding:4px 16px;border-radius:20px;font-size:12px;font-weight:bold;margin:10px 0 4px;}
.section{padding:18px 28px;border-bottom:1px solid #e5e7eb;}
.section h3{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.info-grid{display:grid;grid-template-columns:120px 1fr;gap:4px 8px;font-size:12px;}
.info-grid .lbl{color:#6b7280;}
.info-grid .val{font-weight:600;color:#111827;}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px 28px;}
table{width:100%;border-collapse:collapse;}
th{padding:7px 10px;font-size:11px;font-weight:600;}
.neto{background:#2563EB;padding:18px;text-align:center;margin:0 28px 18px;}
.neto p{color:#bfdbfe;font-size:11px;text-transform:uppercase;letter-spacing:.08em;}
.neto strong{display:block;color:#fff;font-size:28px;font-weight:900;margin-top:6px;}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:20px 40px 28px;}
.sig{text-align:center;border-top:2px solid #d1d5db;padding-top:8px;font-size:11px;}
.sig strong{display:block;color:#374151;margin-bottom:4px;}
.sig span{color:#6b7280;}
.noprint{text-align:center;padding:12px;background:#f9fafb;border-top:1px solid #e5e7eb;}
.noprint button{padding:8px 24px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px;}
@media print{.noprint{display:none;}body{background:#fff;}.page{box-shadow:none;border-radius:0;}}
</style></head><body>
<div class="page">
  <div class="header">
    <h1>${companyName}</h1>
    ${companyAddress ? `<p>${companyAddress}</p>` : ''}
    <div class="badge">COMPROBANTE DE PAGO</div>
    <p>No. ${v.number || ''}</p>
  </div>
  <div class="section">
    <h3>Información del Empleado</h3>
    <div class="info-grid">
      <span class="lbl">Nombre:</span><span class="val">${v.employee_name || ''}</span>
      <span class="lbl">Identidad:</span><span class="val">${v.employee_cedula || ''}</span>
      <span class="lbl">Código:</span><span class="val">${v.employee_code || ''}</span>
      <span class="lbl">Cargo:</span><span class="val">${v.employee_cargo || ''}</span>
      ${v.employee_departamento ? `<span class="lbl">Departamento:</span><span class="val">${v.employee_departamento}</span>` : ''}
    </div>
  </div>
  <div class="section">
    <h3>Período de Pago</h3>
    <div class="info-grid">
      <span class="lbl">Desde:</span><span class="val">${v.period_from || ''}</span>
      <span class="lbl">Hasta:</span><span class="val">${v.period_to || ''}</span>
      <span class="lbl">Fecha de Pago:</span><span class="val">${v.pay_date || ''}</span>
    </div>
  </div>
  <div class="cols">
    <div>
      <table><thead><tr style="background:#f0fdf4;"><th style="text-align:left;color:#059669;">Ingresos</th><th style="text-align:right;color:#059669;">Monto</th></tr></thead>
      <tbody>${ingresoRows || '<tr><td colspan="2" style="padding:8px;color:#9ca3af;font-size:12px;">—</td></tr>'}</tbody>
      <tfoot><tr style="background:#f0fdf4;"><td style="padding:7px 10px;font-weight:700;color:#059669;font-size:12px;">Total</td><td style="padding:7px 10px;text-align:right;font-weight:700;color:#059669;font-size:12px;">${fmtN(v.total_ingresos)}</td></tr></tfoot></table>
    </div>
    <div>
      <table><thead><tr style="background:#fef2f2;"><th style="text-align:left;color:#dc2626;">Deducciones</th><th style="text-align:right;color:#dc2626;">Monto</th></tr></thead>
      <tbody>${deducRows || '<tr><td colspan="2" style="padding:8px;color:#9ca3af;font-size:12px;">—</td></tr>'}</tbody>
      <tfoot><tr style="background:#fef2f2;"><td style="padding:7px 10px;font-weight:700;color:#dc2626;font-size:12px;">Total</td><td style="padding:7px 10px;text-align:right;font-weight:700;color:#dc2626;font-size:12px;">${fmtN(v.total_deducciones)}</td></tr></tfoot></table>
    </div>
  </div>
  <div class="neto"><p>NETO A PAGAR</p><strong>${fmtN(v.neto)}</strong></div>
  <div class="sigs">
    <div class="sig"><strong>Firma del Empleado</strong><span>${v.employee_name || ''}</span></div>
    <div class="sig"><strong>Recursos Humanos</strong><span>${companyName}</span></div>
  </div>
  <div class="noprint"><button onclick="window.print()">🖨 Imprimir / Guardar PDF</button></div>
</div></body></html>`
}

function buildSummaryPrintHtml(employee, vouchers, companyName, companyAddress) {
  const fmtN = n => 'L. ' + parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const totalNeto = vouchers.reduce((s, v) => s + (parseFloat(v.neto) || 0), 0)
  const totalIngresos = vouchers.reduce((s, v) => s + (parseFloat(v.total_ingresos) || 0), 0)
  const totalDeduc    = vouchers.reduce((s, v) => s + (parseFloat(v.total_deducciones) || 0), 0)
  const rows = vouchers.map(v => `
    <tr>
      <td style="padding:7px 10px;font-size:12px;font-family:monospace;color:#6b7280;">${v.number || ''}</td>
      <td style="padding:7px 10px;font-size:12px;">${v.period_from} al ${v.period_to}</td>
      <td style="padding:7px 10px;font-size:12px;">${v.pay_date || ''}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;color:#059669;">${fmtN(v.total_ingresos)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;color:#dc2626;">${fmtN(v.total_deducciones)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700;">${fmtN(v.neto)}</td>
    </tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resumen ${employee.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#f3f4f6;}
.page{max-width:760px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);}
.header{background:#2563EB;padding:24px 32px;color:#fff;}
.header h1{font-size:18px;}
.header p{font-size:11px;color:#bfdbfe;margin-top:4px;}
.section{padding:16px 28px;border-bottom:1px solid #e5e7eb;}
.section h3{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.info-grid{display:grid;grid-template-columns:130px 1fr 130px 1fr;gap:4px 8px;font-size:12px;}
.lbl{color:#6b7280;}.val{font-weight:600;color:#111827;}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:16px 28px;border-bottom:1px solid #e5e7eb;}
.stat{background:#f9fafb;border-radius:8px;padding:12px 16px;text-align:center;}
.stat p{font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px;}
.stat strong{font-size:16px;font-weight:900;}
table{width:100%;border-collapse:collapse;}
thead tr{background:#f3f4f6;}
th{padding:8px 10px;font-size:11px;font-weight:600;color:#6b7280;text-align:left;}
tbody tr:nth-child(even){background:#f9fafb;}
tfoot tr{background:#e8f0fd;font-weight:700;}
tfoot td{padding:8px 10px;font-size:13px;}
.noprint{text-align:center;padding:12px;background:#f9fafb;border-top:1px solid #e5e7eb;}
.noprint button{padding:8px 24px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px;}
@media print{.noprint{display:none;}body{background:#fff;}.page{box-shadow:none;border-radius:0;}}
</style></head><body>
<div class="page">
  <div class="header">
    <h1>Resumen de Pagos — ${employee.name}</h1>
    <p>${companyName}${companyAddress ? ' · ' + companyAddress : ''}</p>
  </div>
  <div class="section">
    <h3>Datos del Empleado</h3>
    <div class="info-grid">
      <span class="lbl">Nombre:</span><span class="val">${employee.name || ''}</span>
      <span class="lbl">Identidad:</span><span class="val">${employee.cedula || ''}</span>
      <span class="lbl">Código:</span><span class="val">${employee.code || ''}</span>
      <span class="lbl">Cargo:</span><span class="val">${employee.cargo || ''}</span>
      <span class="lbl">Departamento:</span><span class="val">${employee.departamento || '—'}</span>
      <span class="lbl">Correo:</span><span class="val">${employee.email || '—'}</span>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><p>Total Pagos</p><strong>${vouchers.length}</strong></div>
    <div class="stat"><p>Total Ingresos</p><strong style="color:#059669">${fmtN(totalIngresos)}</strong></div>
    <div class="stat"><p>Neto Acumulado</p><strong style="color:#2563EB">${fmtN(totalNeto)}</strong></div>
  </div>
  <div style="padding:16px 28px 20px;">
    <h3 style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Historial de Comprobantes</h3>
    ${vouchers.length === 0 ? '<p style="color:#9ca3af;font-size:13px;">No hay comprobantes registrados.</p>' : `
    <table>
      <thead><tr><th>No.</th><th>Período</th><th>Fecha Pago</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Deducciones</th><th style="text-align:right">Neto</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="3">Totales (${vouchers.length} pagos)</td>
        <td style="text-align:right;color:#059669;">${fmtN(totalIngresos)}</td>
        <td style="text-align:right;color:#dc2626;">${fmtN(totalDeduc)}</td>
        <td style="text-align:right;color:#2563EB;">${fmtN(totalNeto)}</td>
      </tr></tfoot>
    </table>`}
  </div>
  <div class="noprint"><button onclick="window.print()">🖨 Imprimir / Guardar PDF</button></div>
</div></body></html>`
}

// ── Employee Modal ────────────────────────────────────────────────────────────
function EmpleadoModal({ emp, onClose, onSave }) {
  const [form, setForm] = useState(emp ? { ...emp } : {
    name: '', cedula: '', email: '', cargo: '', code: '', departamento: '', salario_base: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">{emp ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3">
          {[
            { k: 'name',         label: 'Nombre Completo *', full: true },
            { k: 'cedula',       label: 'Cédula / Identidad' },
            { k: 'email',        label: 'Correo Electrónico', type: 'email' },
            { k: 'cargo',        label: 'Cargo / Puesto' },
            { k: 'code',         label: 'Código de Empleado' },
            { k: 'departamento', label: 'Departamento' },
            { k: 'salario_base', label: 'Salario Base (L.)', type: 'number' },
          ].map(({ k, label, full, type = 'text' }) => (
            <div key={k} className={full ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={() => { if (!form.name) return alert('Nombre es obligatorio'); onSave(form) }}
            className="flex-1 py-2 text-white font-bold rounded-lg" style={{ backgroundColor: ACCENT }}>Guardar</button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Voucher Form ──────────────────────────────────────────────────────────────
function VoucherModal({ employee, voucher, onClose, onSave }) {
  const salario = parseFloat(employee.salario_base) || 0
  const ihss    = Math.round(salario * 0.025 * 100) / 100
  const rap     = Math.round(salario * 0.015 * 100) / 100
  const isEdit  = !!voucher

  const [form, setForm] = useState(isEdit ? {
    period_from: voucher.period_from,
    period_to:   voucher.period_to,
    pay_date:    voucher.pay_date,
    concepts:    voucher.concepts || [],
  } : {
    period_from: today().slice(0, 7) + '-01',
    period_to:   today(),
    pay_date:    today(),
    concepts: [
      { type: 'ingreso',    description: 'Salario Base', amount: salario },
      { type: 'deduccion',  description: 'IHSS (2.5%)',  amount: ihss   },
      { type: 'deduccion',  description: 'RAP (1.5%)',   amount: rap    },
    ],
  })
  const [sending, setSending] = useState(false)

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const setConcept = (idx, field, val) => {
    setForm(p => {
      const concepts = p.concepts.map((c, i) =>
        i === idx ? { ...c, [field]: field === 'amount' ? parseFloat(val) || 0 : val } : c
      )
      return { ...p, concepts }
    })
  }
  const addConcept = (type) => setForm(p => ({ ...p, concepts: [...p.concepts, { type, description: '', amount: 0 }] }))
  const removeConcept = (idx) => setForm(p => ({ ...p, concepts: p.concepts.filter((_, i) => i !== idx) }))

  const ingresos    = form.concepts.filter(c => c.type === 'ingreso')
  const deducciones = form.concepts.filter(c => c.type === 'deduccion')
  const totalIngresos    = ingresos.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const totalDeducciones = deducciones.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const neto = totalIngresos - totalDeducciones

  const buildPayload = () => ({
    ...form,
    total_ingresos:    Math.round(totalIngresos    * 100) / 100,
    total_deducciones: Math.round(totalDeducciones * 100) / 100,
    neto:              Math.round(neto             * 100) / 100,
  })

  const handleSave = () => onSave(buildPayload(), false)
  const handleSaveAndSend = async () => {
    setSending(true)
    await onSave(buildPayload(), true)
    setSending(false)
  }

  const ConceptRow = ({ c, idx }) => (
    <div className="flex items-center gap-2">
      <input type="text" value={c.description} onChange={e => setConcept(idx, 'description', e.target.value)}
        placeholder="Concepto" className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <input type="number" step="0.01" min="0" value={c.amount} onChange={e => setConcept(idx, 'amount', e.target.value)}
        className="w-28 border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <button onClick={() => removeConcept(idx)} className="text-gray-300 hover:text-red-500 font-bold text-lg leading-none">✕</button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">{isEdit ? 'Editar Comprobante' : 'Nuevo Comprobante de Pago'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{employee.name} · {employee.cargo || 'Sin cargo'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Period */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'period_from', label: 'Período Desde' },
              { k: 'period_to',   label: 'Período Hasta' },
              { k: 'pay_date',    label: 'Fecha de Pago'  },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <input type="date" value={form[k]} onChange={e => setF(k, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Ingresos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide">Ingresos</h3>
                <button onClick={() => addConcept('ingreso')}
                  className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {form.concepts.map((c, idx) => c.type === 'ingreso'
                  ? <ConceptRow key={idx} c={c} idx={idx} />
                  : null
                )}
              </div>
              <div className="mt-2 flex justify-between items-center px-1 border-t border-green-100 pt-2">
                <span className="text-xs font-bold text-green-700 uppercase">Total Ingresos</span>
                <span className="text-sm font-black text-green-700">{fmt(totalIngresos)}</span>
              </div>
            </div>

            {/* Deducciones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide">Deducciones</h3>
                <button onClick={() => addConcept('deduccion')}
                  className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {form.concepts.map((c, idx) => c.type === 'deduccion'
                  ? <ConceptRow key={idx} c={c} idx={idx} />
                  : null
                )}
              </div>
              <div className="mt-2 flex justify-between items-center px-1 border-t border-red-100 pt-2">
                <span className="text-xs font-bold text-red-600 uppercase">Total Deducciones</span>
                <span className="text-sm font-black text-red-600">{fmt(totalDeducciones)}</span>
              </div>
            </div>
          </div>

          {/* Net */}
          <div className="rounded-xl px-6 py-4 text-center" style={{ backgroundColor: ACCENT }}>
            <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Neto a Pagar</p>
            <p className="text-white text-3xl font-black">{fmt(neto)}</p>
          </div>

          {!employee.email && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs text-yellow-800 font-semibold">
              ⚠ Este empleado no tiene correo registrado. Puedes guardar el voucher sin enviarlo.
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={handleSave} className="flex-1 py-2 text-white font-bold rounded-lg" style={{ backgroundColor: ACCENT }}>
            Guardar
          </button>
          {!isEdit && employee.email && (
            <button onClick={handleSaveAndSend} disabled={sending}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50">
              {sending ? 'Enviando…' : '✉ Guardar y Enviar'}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vouchers Panel ────────────────────────────────────────────────────────────
function VouchersPanel({ employee, onClose }) {
  const [vouchers, setVouchers]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showNew, setShowNew]         = useState(false)
  const [editing, setEditing]         = useState(null)
  const [sending, setSending]         = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [companyAddr, setCompanyAddr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setVouchers(await api.getVouchers(employee._id)) }
    catch { setVouchers([]) }
    finally { setLoading(false) }
  }, [employee._id])

  useEffect(() => {
    load()
    api.getConfig().then(cfg => {
      setCompanyName(cfg.company_name || '')
      setCompanyAddr(cfg.company_address || '')
    }).catch(() => {})
  }, [load])

  const handleSave = async (payload, sendEmail) => {
    const saved = await api.createVoucher(employee._id, payload)
    if (!saved?._id) { alert('Error al guardar el voucher'); return }
    if (sendEmail) {
      setSending(saved._id)
      const result = await api.sendVoucher(saved._id)
      setSending(null)
      if (result?.error) alert('Voucher guardado, pero falló el envío:\n\n' + result.error)
      else alert('Correo enviado exitosamente a ' + employee.email)
    }
    setShowNew(false)
    load()
  }

  const handleUpdate = async (payload) => {
    await api.updateVoucher(editing._id, payload)
    setEditing(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este comprobante?')) return
    await api.deleteVoucher(id)
    load()
  }

  const handleResend = async (id) => {
    setSending(id)
    const result = await api.sendVoucher(id)
    setSending(null)
    if (result?.error) alert('Error al enviar correo:\n\n' + result.error)
    else { alert('Correo enviado exitosamente'); load() }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="font-bold text-gray-800">Comprobantes de Pago</h2>
              <p className="text-xs text-gray-500 mt-0.5">{employee.name} · {employee.email || 'Sin correo'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openPrint(buildSummaryPrintHtml(employee, vouchers, companyName, companyAddr))}
                className="px-3 py-1.5 text-sm font-bold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                📊 Resumen PDF
              </button>
              <button onClick={() => setShowNew(true)}
                className="px-3 py-1.5 text-sm font-bold text-white rounded-lg" style={{ backgroundColor: ACCENT }}>
                + Nuevo Voucher
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Cargando...</p>
            ) : vouchers.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-2">📄</div>
                <p>No hay comprobantes generados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['No.','Período','Fecha Pago','Neto','Correo','Acciones'].map(h => (
                        <th key={h} className={`px-3 py-2 font-semibold text-gray-600 whitespace-nowrap ${h === 'Neto' ? 'text-right' : h === 'Acciones' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map(v => (
                      <tr key={v._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">{v.number}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{v.period_from} al {v.period_to}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{v.pay_date}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap">{fmt(v.neto)}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {v.email_sent
                            ? <span className="text-xs text-green-600 font-semibold">✓ Enviado</span>
                            : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openPrint(buildVoucherPrintHtml(v, companyName, companyAddr))}
                              className="text-xs font-semibold px-2 py-1 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200">
                              PDF
                            </button>
                            <button onClick={() => setEditing(v)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100">
                              Editar
                            </button>
                            {employee.email && (
                              <button onClick={() => handleResend(v._id)} disabled={sending === v._id}
                                className="text-xs font-semibold px-2 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">
                                {sending === v._id ? '…' : '✉'}
                              </button>
                            )}
                            <button onClick={() => handleDelete(v._id)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-100">
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {showNew && (
        <VoucherModal employee={employee} onClose={() => setShowNew(false)} onSave={handleSave} />
      )}
      {editing && (
        <VoucherModal employee={employee} voucher={editing} onClose={() => setEditing(null)} onSave={(p) => handleUpdate(p)} />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Empleados() {
  const [empleados, setEmpleados]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState(null)  // 'new' | 'edit'
  const [selected, setSelected]       = useState(null)
  const [vPanel, setVPanel]           = useState(null)  // employee to show vouchers
  const [xlsxLoading, setXlsxLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEmpleados(await api.getEmpleados()) }
    catch { setEmpleados([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = empleados.filter(e =>
    !search ||
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.cedula || '').includes(search) ||
    (e.cargo || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.code || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (form) => {
    if (modal === 'new') await api.createEmpleado(form)
    else await api.updateEmpleado(selected._id, form)
    setModal(null); setSelected(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este empleado y todos sus vouchers?')) return
    await api.deleteEmpleado(id); load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: ACCENT }}>
        <div>
          <h1 className="text-xl font-bold text-white">Empleados</h1>
          <p className="text-blue-100 text-sm">Gestión de empleados y comprobantes de pago</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => { setXlsxLoading(true); try { await exportEmpleadosXlsx(empleados) } catch(e) { alert('Error al generar reporte: ' + e.message) } finally { setXlsxLoading(false) } }}
            disabled={xlsxLoading || empleados.length === 0}
            className="px-4 py-2 rounded-lg font-bold text-sm bg-white/20 text-white hover:bg-white/30 disabled:opacity-50">
            {xlsxLoading ? 'Generando...' : '📥 Reporte XLSX'}
          </button>
          <button onClick={() => setModal('new')} className="px-4 py-2 rounded-lg font-bold text-sm bg-white" style={{ color: ACCENT }}>
            + Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex gap-3">
          <input type="text" placeholder="Buscar por nombre, cédula, cargo..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Código','Nombre','Cédula','Cargo','Departamento','Salario Base','Correo','Acciones'].map(h => (
                  <th key={h} className={`px-4 py-3 font-semibold text-gray-600 whitespace-nowrap ${h === 'Salario Base' ? 'text-right' : h === 'Acciones' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">👥</div>
                  <p>No hay empleados registrados</p>
                </td></tr>
              ) : filtered.map(e => (
                <tr key={e._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{e.code || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{e.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.cedula || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.cargo || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.departamento || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700 font-semibold whitespace-nowrap">{e.salario_base ? fmt(e.salario_base) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{e.email || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setVPanel(e)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: ACCENT }}>
                        Vouchers
                      </button>
                      <button onClick={() => { setSelected(e); setModal('edit') }}
                        className="text-xs font-semibold px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(e._id)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-100">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <EmpleadoModal
          emp={modal === 'edit' ? selected : null}
          onClose={() => { setModal(null); setSelected(null) }}
          onSave={handleSave}
        />
      )}
      {vPanel && (
        <VouchersPanel
          employee={vPanel}
          onClose={() => setVPanel(null)}
        />
      )}
    </div>
  )
}
