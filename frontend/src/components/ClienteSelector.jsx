import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'

/**
 * Searchable dropdown that selects a client from the catalog.
 * When a client is picked, it calls onSelect({ id, name, address, rtn, email }).
 * onClear resets back to manual mode.
 */
export default function ClienteSelector({ selectedId, selectedName, onSelect, onClear, accentColor = '#1e40af' }) {
  const [clientes, setClientes]   = useState([])
  const [search, setSearch]       = useState('')
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setLoading(true)
    api.getClientes().then(d => setClientes(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(s) ||
      (c.company || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.rtn || '').toLowerCase().includes(s)
  })

  const handlePick = (c) => {
    onSelect({
      id:      c._id,
      name:    c.name,
      company: c.company || '',
      address: c.address || '',
      rtn:     c.rtn     || '',
      email:   c.email   || '',
    })
    setOpen(false)
    setSearch('')
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm">
        <span className="text-blue-600 font-bold text-base">👤</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-blue-800 truncate block">{selectedName}</span>
          <span className="text-xs text-blue-500">Cliente del catálogo</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-blue-400 hover:text-blue-700 font-bold text-sm flex-shrink-0 px-1"
          title="Quitar selección"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 bg-gray-50 cursor-text"
        onClick={() => setOpen(true)}>
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
          placeholder={loading ? 'Cargando clientes...' : `Buscar en catálogo (${clientes.length} clientes)...`}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {clientes.length > 0 && (
          <span className="text-xs text-gray-400">{clientes.length}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {search ? 'Sin coincidencias' : 'No hay clientes en el catálogo'}
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c._id}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm flex-shrink-0">
                  👤
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[c.company, c.email, c.rtn].filter(Boolean).join(' · ') || 'Sin detalles'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
