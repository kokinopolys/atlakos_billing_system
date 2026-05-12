import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BLUE = '#1e40af'

const CATEGORIAS = [
  'Cloud Services', 'Desarrollo Web', 'Desarrollo Móvil', 'Consultoría',
  'Infraestructura', 'Seguridad', 'Data & Analytics', 'DevOps', 'IA & Machine Learning',
  'Licencias & SaaS', 'Soporte & Mantenimiento', 'Otros',
]
const UNITS = ['servicio', 'hora', 'mes', 'proyecto', 'licencia', 'usuario', 'instancia', 'GB', 'TB', 'módulo', 'und']

function ServicioModal({ servicio, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'Consultoría', unit: 'servicio', unit_price: '', sku: '', notes: '',
    ...(servicio || {}),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      const res = servicio?._id
        ? await api.updateServicio(servicio._id, form)
        : await api.createServicio(form)
      if (res.error) { setError(res.error); return }
      onSave(res)
    } catch {
      setError('Error al guardar servicio')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{servicio?._id ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del Servicio *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="Ej: Desarrollo de App Web" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inp} rows={2} placeholder="Descripción del servicio..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad</label>
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio Unitario (L.)</label>
              <input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">SKU / Código</label>
              <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} className={inp} placeholder="SKU-001" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} rows={2} placeholder="Notas..." />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: BLUE }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CatalogoServicios() {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal]         = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search)    params.search = search
      if (catFilter) params.category = catFilter
      const data = await api.getServicios(params)
      setServicios(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, catFilter]) // eslint-disable-line

  const handleDelete = async (s) => {
    if (!window.confirm(`¿Eliminar el servicio "${s.name}"?`)) return
    try {
      await api.deleteServicio(s._id)
      load()
    } catch {
      alert('Error al eliminar servicio')
    }
  }

  const totalServicios = servicios.length
  const avgPrice = totalServicios > 0
    ? servicios.reduce((s, sv) => s + (sv.unit_price || 0), 0) / totalServicios
    : 0

  return (
    <div>
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: BLUE }}>
        <div>
          <h1 className="text-xl font-bold text-white">Catálogo de Servicios</h1>
          <p className="text-blue-300 text-sm">Servicios tecnológicos disponibles</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-white hover:bg-blue-50"
          style={{ color: BLUE }}>
          + Nuevo Servicio
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Servicios</p>
            <p className="text-2xl font-black" style={{ color: BLUE }}>{totalServicios}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Precio Promedio</p>
            <p className="text-2xl font-black text-gray-800">L. {fmt(avgPrice)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Categorías</p>
            <p className="text-2xl font-black text-gray-800">
              {[...new Set(servicios.map(s => s.category))].length}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar servicio..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none"
            onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${BLUE}40`}
            onBlur={e => e.target.style.boxShadow = 'none'} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando servicios...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Servicio</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Precio Unit.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {servicios.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-400 truncate max-w-xs">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.category}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.sku || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{s.unit}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: BLUE }}>
                        {s.unit_price > 0 ? `L. ${fmt(s.unit_price)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal({ type: 'edit', servicio: s })}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(s)}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {servicios.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-10">No hay servicios. Agrega el primero.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ServicioModal
          servicio={modal.type === 'edit' ? modal.servicio : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
