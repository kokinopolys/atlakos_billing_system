import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

const ACCENT = '#059669'
const fmt = n => 'L. ' + parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS = {
  pendiente: { label: 'Pendiente', bg: '#FEF9C3', text: '#854D0E' },
  pagada:    { label: 'Pagada',    bg: '#DCFCE7', text: '#166534' },
  vencida:   { label: 'Vencida',   bg: '#FEE2E2', text: '#991B1B' },
  parcial:   { label: 'Parcial',   bg: '#DBEAFE', text: '#1E40AF' },
}

function Badge({ status }) {
  const s = STATUS[status] || { label: status, bg: '#F3F4F6', text: '#374151' }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</span>
}

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  due_date: '',
  client_name: '',
  description: '',
  reference: '',
  amount: '',
  notes: '',
})

function EntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry ? { ...entry } : emptyForm())
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">{entry ? 'Editar CXC' : 'Nueva Cuenta por Cobrar'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de Vencimiento</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente *</label>
            <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Nombre del cliente"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Concepto"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Referencia (Factura/COT)</label>
              <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Ej: 000-001-01-00000001"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Monto (L.) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={() => onSave(form)} className="flex-1 py-2 text-white font-bold rounded-lg" style={{ backgroundColor: ACCENT }}>Guardar</button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function PayModal({ entry, onClose, onPay }) {
  const [paid, setPaid] = useState(String(entry.amount || ''))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Registrar Cobro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Cliente: <strong>{entry.client_name}</strong></p>
          <p className="text-sm text-gray-600">Total pendiente: <strong>{fmt(entry.amount)}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Monto Cobrado (L.)</label>
            <input type="number" step="0.01" min="0" value={paid} onChange={e => setPaid(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de Cobro</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={() => onPay({ paid_amount: parseFloat(paid), paid_date: date })}
            className="flex-1 py-2 text-white font-bold rounded-lg" style={{ backgroundColor: ACCENT }}>
            Confirmar Cobro
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg font-semibold">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function CXC() {
  const [entries, setEntries] = useState([])
  const [resumen, setResumen] = useState({ pendiente: 0, cobrada: 0, vencida: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, sum] = await Promise.all([
        api.getCXC({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getCXCResumen(),
      ])
      setEntries(Array.isArray(data) ? data : [])
      setResumen(sum || { pendiente: 0, cobrada: 0, vencida: 0 })
    } catch { setEntries([]) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter(e =>
    !search ||
    (e.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (form) => {
    if (!form.client_name || !form.amount) return alert('Cliente y monto son obligatorios')
    if (modal === 'new') await api.createCXC(form)
    else await api.updateCXC(selected._id, form)
    setModal(null); setSelected(null); load()
  }

  const handlePay = async ({ paid_amount, paid_date }) => {
    await api.payCXC(selected._id, { paid_amount, paid_date })
    setModal(null); setSelected(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cuenta por cobrar?')) return
    await api.deleteCXC(id); load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: ACCENT }}>
        <div>
          <h1 className="text-xl font-bold text-white">Cuentas por Cobrar (CXC)</h1>
          <p className="text-green-100 text-sm">Registro de cobros pendientes y realizados</p>
        </div>
        <button onClick={() => setModal('new')} className="px-4 py-2 rounded-lg font-bold text-sm bg-white" style={{ color: ACCENT }}>
          + Nueva CXC
        </button>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Por Cobrar', value: resumen.pendiente, color: ACCENT },
            { label: 'Cobrado', value: resumen.cobrada, color: '#374151' },
            { label: 'Vencido', value: resumen.vencida, color: '#DC2626' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{c.label}</p>
              <p className="text-2xl font-black" style={{ color: c.color }}>{fmt(c.value)}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Buscar cliente, referencia..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-green-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="vencida">Vencidas</option>
            <option value="parcial">Parciales</option>
            <option value="pagada">Pagadas</option>
          </select>
          <button onClick={load} className="px-3 py-2 text-sm font-semibold rounded-lg text-white" style={{ backgroundColor: ACCENT }}>↻ Actualizar</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['No.','Fecha','Vence','Cliente','Descripción','Referencia','Monto','Estado','Acciones'].map(h => (
                    <th key={h} className={`px-4 py-3 font-semibold text-gray-600 ${h === 'Monto' ? 'text-right' : h === 'Estado' || h === 'Acciones' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No hay cuentas por cobrar registradas</p>
                  </td></tr>
                ) : filtered.map(e => (
                  <tr key={e._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.number || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.due_date || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{e.client_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.reference || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-center"><Badge status={e.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {e.status !== 'pagada' && (
                          <button onClick={() => { setSelected(e); setModal('pay') }}
                            className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: ACCENT }}>
                            Cobrar
                          </button>
                        )}
                        <button onClick={() => { setSelected(e); setModal('edit') }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100">
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
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <EntryModal
          entry={modal === 'edit' ? selected : null}
          onClose={() => { setModal(null); setSelected(null) }}
          onSave={handleSave}
        />
      )}
      {modal === 'pay' && (
        <PayModal
          entry={selected}
          onClose={() => { setModal(null); setSelected(null) }}
          onPay={handlePay}
        />
      )}
    </div>
  )
}
