import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { SortTh, sortRows } from '../components/SortTh'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const RED = '#dc2626'

function GastoModal({ gasto, categorias, onClose, onSave }) {
  const today = new Date().toLocaleDateString('en-CA')
  const [form, setForm] = useState({
    description: '', monto: '', categoria: 'Otros', date: today, notes: '',
    ...(gasto || {}),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.description.trim() || !form.monto || !form.date) { setError('Descripción, monto y fecha son requeridos'); return }
    setSaving(true)
    setError(null)
    try {
      const res = gasto?._id
        ? await api.updateGasto(gasto._id, form)
        : await api.createGasto(form)
      if (res.error) { setError(res.error); return }
      onSave(res)
    } catch {
      setError('Error al guardar gasto')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{gasto?._id ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción *</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inp} placeholder="Descripción del gasto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Monto (L.) *</label>
              <input type="number" step="0.01" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className={inp}>
              {(categorias || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} rows={2} placeholder="Notas opcionales..." />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: RED }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GastosPage() {
  const today    = new Date().toLocaleDateString('en-CA')
  const firstDay = today.slice(0, 7) + '-01'

  const [gastos, setGastos]         = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [from, setFrom]             = useState(firstDay)
  const [to, setTo]                 = useState(today)
  const [catFilter, setCatFilter]   = useState('')
  const [modal, setModal]           = useState(null)
  const [sortKey, setSortKey]       = useState('date')
  const [sortDir, setSortDir]       = useState('desc')

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (from)      params.from = from
      if (to)        params.to   = to
      if (catFilter) params.categoria = catFilter
      const [data, cats] = await Promise.all([api.getGastos(params), api.getGastoCategorias()])
      setGastos(Array.isArray(data) ? data : [])
      setCategorias(Array.isArray(cats) ? cats : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to, catFilter]) // eslint-disable-line

  const handleDelete = async (g) => {
    if (!window.confirm('¿Eliminar este gasto?')) return
    try {
      await api.deleteGasto(g._id)
      load()
    } catch {
      alert('Error al eliminar gasto')
    }
  }

  const sorted = sortRows(gastos, sortKey, sortDir)
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0)

  return (
    <div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: RED }}>
        <div>
          <h1 className="text-xl font-bold text-white">Gastos y Costos</h1>
          <p className="text-red-200 text-sm">Registro de gastos operativos</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-white hover:bg-red-50"
          style={{ color: RED }}>
          + Nuevo Gasto
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Gastos</p>
            <p className="text-2xl font-black text-red-500">L. {fmt(totalGastos)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Registros</p>
            <p className="text-2xl font-black text-gray-800">{gastos.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Promedio por Gasto</p>
            <p className="text-2xl font-black text-gray-800">
              L. {fmt(gastos.length > 0 ? totalGastos / gastos.length : 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando gastos...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortTh label="Descripción" col="description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                    <SortTh label="Categoría"   col="categoria"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                    <SortTh label="Fecha"       col="date"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                    <SortTh label="Monto"       col="monto"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" className="text-xs uppercase" />
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map(g => (
                    <tr key={g._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{g.description}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{g.categoria}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{g.date}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">L. {fmt(g.monto)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal({ type: 'edit', gasto: g })}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(g)}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {gastos.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-10">No hay gastos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <GastoModal
          gasto={modal.type === 'edit' ? modal.gasto : null}
          categorias={categorias}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
