import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

const ACCENT = '#2563EB'
const fmt = n => 'L. ' + parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

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
function VoucherModal({ employee, onClose, onSave }) {
  const salario = parseFloat(employee.salario_base) || 0
  const ihss    = Math.round(salario * 0.025 * 100) / 100
  const rap     = Math.round(salario * 0.015 * 100) / 100

  const [form, setForm] = useState({
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
            <h2 className="font-bold text-gray-800">Nuevo Comprobante de Pago</h2>
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
          {employee.email && (
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
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [sending, setSending]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setVouchers(await api.getVouchers(employee._id)) }
    catch { setVouchers([]) }
    finally { setLoading(false) }
  }, [employee._id])

  useEffect(() => { load() }, [load])

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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="font-bold text-gray-800">Comprobantes de Pago</h2>
              <p className="text-xs text-gray-500 mt-0.5">{employee.name} · {employee.email || 'Sin correo'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNew(true)}
                className="px-3 py-1.5 text-sm font-bold text-white rounded-lg" style={{ backgroundColor: ACCENT }}>
                + Nuevo Voucher
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Cargando...</p>
            ) : vouchers.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-2">📄</div>
                <p>No hay comprobantes generados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['No.','Período','Fecha Pago','Neto','Correo','Acciones'].map(h => (
                      <th key={h} className={`px-3 py-2 font-semibold text-gray-600 ${h === 'Neto' ? 'text-right' : h === 'Acciones' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.number}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{v.period_from} al {v.period_to}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{v.pay_date}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(v.neto)}</td>
                      <td className="px-3 py-2 text-center">
                        {v.email_sent
                          ? <span className="text-xs text-green-600 font-semibold">✓ Enviado</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {employee.email && (
                          <button
                            onClick={() => handleResend(v._id)}
                            disabled={sending === v._id}
                            className="text-xs font-semibold px-2 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">
                            {sending === v._id ? '…' : '✉ Reenviar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {showNew && (
        <VoucherModal
          employee={employee}
          onClose={() => setShowNew(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)  // 'new' | 'edit'
  const [selected, setSelected]   = useState(null)
  const [vPanel, setVPanel]       = useState(null)  // employee to show vouchers

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
        <button onClick={() => setModal('new')} className="px-4 py-2 rounded-lg font-bold text-sm bg-white" style={{ color: ACCENT }}>
          + Nuevo Empleado
        </button>
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
