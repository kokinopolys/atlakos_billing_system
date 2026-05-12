import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { SortTh, sortRows } from '../components/SortTh'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BLUE = '#1e40af'

function ClienteModal({ cliente, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', address: '', rtn: '', notes: '',
    ...(cliente || {}),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      let res
      if (cliente?._id) {
        res = await api.updateCliente(cliente._id, form)
      } else {
        res = await api.createCliente(form)
      }
      if (res.error) { setError(res.error); return }
      onSave(res)
    } catch {
      setError('Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{cliente?._id ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Empresa</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className={inp} placeholder="Empresa u organización" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">RTN</label>
              <input value={form.rtn} onChange={e => setForm(p => ({ ...p, rtn: e.target.value }))} className={inp} placeholder="RTN" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} placeholder="+504 0000-0000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inp} placeholder="Dirección" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} rows={2} placeholder="Notas adicionales..." />
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

function ClienteDocumentosModal({ cliente, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('facturas')

  useEffect(() => {
    api.getClienteDocumentos(cliente._id)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cliente._id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">{cliente.name}</h2>
            <p className="text-xs text-gray-400">{cliente.company || 'Sin empresa'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex gap-2 px-6 pt-4">
          {['facturas', 'cotizaciones'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize"
              style={tab === t ? { backgroundColor: BLUE, color: '#fff' } : { color: '#6b7280', background: '#f3f4f6' }}>
              {t === 'facturas' ? 'Facturas' : 'Cotizaciones'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-gray-400 text-sm">Cargando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Número</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Fecha</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.[tab] || []).map(doc => (
                  <tr key={doc._id}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{doc.invoice_number}</td>
                    <td className="px-3 py-2 text-gray-500">{doc.date}</td>
                    <td className="px-3 py-2 text-right font-semibold">L. {fmt(doc.total)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{doc.status}</span>
                    </td>
                  </tr>
                ))}
                {(data?.[tab] || []).length === 0 && (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-6 text-sm">Sin {tab}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState('catalogo')
  const [modal, setModal]           = useState(null)
  const [docsModal, setDocsModal]   = useState(null)
  const [sortKey, setSortKey]       = useState('name')
  const [sortDir, setSortDir]       = useState('asc')

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = tab === 'reporte' ? {} : (search ? { search } : {})
      const data = tab === 'reporte'
        ? await api.getClienteReport()
        : await api.getClientes(search ? { search } : {})
      setClientes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, search]) // eslint-disable-line

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Eliminar al cliente "${c.name}"?`)) return
    try {
      await api.deleteCliente(c._id)
      load()
    } catch {
      alert('Error al eliminar cliente')
    }
  }

  const handleSaved = () => {
    setModal(null)
    load()
  }

  const sorted = sortRows(clientes, sortKey, sortDir)
  const totalClientes   = clientes.length
  const totalFacturado  = clientes.reduce((s, c) => s + (c.total_facturado || 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: BLUE }}>
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-blue-300 text-sm">Catálogo y documentos por cliente</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-white hover:bg-blue-50 transition-colors"
          style={{ color: BLUE }}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Clientes</p>
            <p className="text-2xl font-black" style={{ color: BLUE }}>{totalClientes}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Facturado</p>
            <p className="text-2xl font-black text-gray-800">L. {fmt(totalFacturado)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Promedio por cliente</p>
            <p className="text-2xl font-black text-gray-800">
              L. {fmt(totalClientes > 0 ? totalFacturado / totalClientes : 0)}
            </p>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[{ k: 'catalogo', l: 'Catálogo' }, { k: 'reporte', l: 'Reporte' }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                style={tab === t.k ? { backgroundColor: BLUE, color: '#fff' } : { color: '#6b7280' }}>
                {t.l}
              </button>
            ))}
          </div>
          {tab === 'catalogo' && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none"
              onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${BLUE}40`}
              onBlur={e => e.target.style.boxShadow = 'none'} />
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando clientes...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {tab === 'catalogo' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortTh label="Nombre"  col="name"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                      <SortTh label="Empresa" col="company" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                      <SortTh label="Correo"  col="email"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">Teléfono</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map(c => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{c.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.company || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.phone || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setDocsModal(c)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                              style={{ backgroundColor: BLUE }}>
                              Documentos
                            </button>
                            <button onClick={() => setModal({ type: 'edit', cliente: c })}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100">
                              Editar
                            </button>
                            <button onClick={() => handleDelete(c)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clientes.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-10">No hay clientes registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortTh label="Cliente"         col="name"               sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs uppercase" />
                      <SortTh label="Facturas"        col="total_facturas"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="center" className="text-xs uppercase" />
                      <SortTh label="Cotizaciones"    col="total_cotizaciones" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="center" className="text-xs uppercase" />
                      <SortTh label="Total Facturado" col="total_facturado"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right"  className="text-xs uppercase" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map(c => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{c.name}</p>
                          {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{c.total_facturas || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{c.total_cotizaciones || 0}</td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: BLUE }}>L. {fmt(c.total_facturado)}</td>
                      </tr>
                    ))}
                    {clientes.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-gray-400 py-10">Sin datos.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ClienteModal
          cliente={modal.type === 'edit' ? modal.cliente : null}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
      {docsModal && (
        <ClienteDocumentosModal cliente={docsModal} onClose={() => setDocsModal(null)} />
      )}
    </div>
  )
}
