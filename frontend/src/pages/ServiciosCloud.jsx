import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BLUE = '#1e40af'
const INDIGO = '#4f46e5'

// "Paquetes de Servicios Cloud" — analogous to Recetas in atlako
// A package groups multiple servicios/components with quantities and computes a total price

const TABS = [
  { key: 'todos',    label: 'Todos'        },
  { key: 'paquete',  label: 'Paquetes'     },
  { key: 'modulo',   label: 'Sub-módulos'  },
]

function PaqueteModal({ paquete, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', type: 'paquete', category: 'Cloud Services', description: '',
    components: [{ description: '', qty: 1, unit_price: 0 }],
    ...(paquete || {}),
    components: paquete?.components ? [...paquete.components] : [{ description: '', qty: 1, unit_price: 0 }],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const total = form.components.reduce((s, c) => s + (parseFloat(c.qty) || 0) * (parseFloat(c.unit_price) || 0), 0)

  const updateComp = (i, key, val) =>
    setForm(p => { const c = [...p.components]; c[i] = { ...c[i], [key]: val }; return { ...p, components: c } })
  const addComp    = () => setForm(p => ({ ...p, components: [...p.components, { description: '', qty: 1, unit_price: 0 }] }))
  const removeComp = (i) => setForm(p => ({ ...p, components: p.components.filter((_, idx) => idx !== i) }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, total_price: total }
      const res = paquete?._id
        ? await api.updateServicio(paquete._id, payload)
        : await api.createServicio(payload)
      if (res.error) { setError(res.error); return }
      onSave(res)
    } catch {
      setError('Error al guardar paquete')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{paquete?._id ? 'Editar Paquete' : 'Nuevo Paquete de Servicios'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del Paquete *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="Ej: Paquete AWS Startup" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inp}>
                <option value="paquete">Paquete</option>
                <option value="modulo">Sub-módulo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp}>
                {['Cloud Services','Desarrollo Web','Desarrollo Móvil','Consultoría','Infraestructura','Seguridad','Data & Analytics','DevOps','IA & Machine Learning','Licencias & SaaS'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inp} rows={2} />
            </div>
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Componentes del Paquete</label>
              <button type="button" onClick={addComp} className="text-xs font-bold px-3 py-1 rounded-lg text-white" style={{ backgroundColor: INDIGO }}>+ Agregar</button>
            </div>
            <div className="space-y-2">
              {form.components.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inp} col-span-5`} value={c.description} onChange={e => updateComp(i, 'description', e.target.value)} placeholder="Descripción del componente" />
                  <input className={`${inp} col-span-2`} type="number" value={c.qty} onChange={e => updateComp(i, 'qty', e.target.value)} placeholder="Qty" min="0" />
                  <input className={`${inp} col-span-3`} type="number" step="0.01" value={c.unit_price} onChange={e => updateComp(i, 'unit_price', e.target.value)} placeholder="Precio" min="0" />
                  <div className="col-span-1 text-xs text-right font-semibold text-gray-600">
                    {fmt((c.qty || 0) * (c.unit_price || 0))}
                  </div>
                  <button type="button" onClick={() => removeComp(i)} className="col-span-1 text-red-400 hover:text-red-600 text-lg font-bold">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-3 text-right">
            <span className="text-gray-500 text-sm mr-2">Total del Paquete:</span>
            <span className="text-xl font-black" style={{ color: INDIGO }}>L. {fmt(total)}</span>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: INDIGO }}>
              {saving ? 'Guardando...' : 'Guardar Paquete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ServiciosCloud() {
  const navigate = useNavigate()
  const [paquetes, setPaquetes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('todos')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (tab !== 'todos') params.type_filter = tab
      if (search)          params.search = search
      const data = await api.getServicios(params)
      // Filter by type on frontend if needed
      let items = Array.isArray(data) ? data : []
      if (tab !== 'todos') items = items.filter(i => i.type === tab)
      setPaquetes(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, search]) // eslint-disable-line

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar el paquete "${p.name}"?`)) return
    try {
      await api.deleteServicio(p._id)
      load()
    } catch {
      alert('Error al eliminar paquete')
    }
  }

  const totalPaquetes = paquetes.length
  const avgPrice = totalPaquetes > 0
    ? paquetes.reduce((s, p) => s + (p.total_price || p.unit_price || 0), 0) / totalPaquetes
    : 0
  const mostExpensive = paquetes.length > 0
    ? paquetes.reduce((max, p) => ((p.total_price || 0) > (max.total_price || 0) ? p : max), paquetes[0])
    : null

  return (
    <div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: INDIGO }}>
        <div>
          <h1 className="text-xl font-bold text-white">Paquetes de Servicios Cloud</h1>
          <p className="text-indigo-200 text-sm">Crea paquetes tecnológicos con componentes y precios</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-white hover:bg-indigo-50"
          style={{ color: INDIGO }}>
          + Nuevo Paquete
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Paquetes</p>
            <p className="text-2xl font-black" style={{ color: INDIGO }}>{totalPaquetes}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Precio Promedio</p>
            <p className="text-2xl font-black text-gray-800">L. {fmt(avgPrice)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Más costoso</p>
            <p className="text-base font-bold text-gray-800 truncate">{mostExpensive?.name || '—'}</p>
            {mostExpensive && <p className="text-xs mt-0.5" style={{ color: INDIGO }}>L. {fmt(mostExpensive.total_price || 0)}</p>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                style={tab === t.key ? { backgroundColor: INDIGO, color: '#fff' } : { color: '#6b7280' }}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paquete..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none"
            onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${INDIGO}40`}
            onBlur={e => e.target.style.boxShadow = 'none'} />
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando paquetes...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre del Paquete</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Componentes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Precio Total</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paquetes.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: p.type === 'modulo' ? BLUE : INDIGO }}>
                          {p.type === 'modulo' ? 'Sub-módulo' : 'Paquete'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{(p.components || []).length}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: INDIGO }}>
                        {p.total_price != null ? `L. ${fmt(p.total_price)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal({ type: 'edit', paquete: p })}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                            style={{ backgroundColor: INDIGO }}>
                            Ver/Editar
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paquetes.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-10">No hay paquetes. Crea el primero.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <PaqueteModal
          paquete={modal.type === 'edit' ? modal.paquete : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
