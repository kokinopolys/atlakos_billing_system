import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'

const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function StatusBadge({ status }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (status === 'pendiente')  return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendiente</span>
  if (status === 'aceptada')   return <span className={`${base} bg-green-100 text-green-800`}>Aceptada</span>
  if (status === 'rechazada')  return <span className={`${base} bg-red-100 text-red-800`}>Rechazada</span>
  if (status === 'facturada')  return <span className={`${base} bg-blue-100 text-blue-800`}>Facturada</span>
  return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente',  label: 'Pendiente' },
  { value: 'aceptada',   label: 'Aceptada' },
  { value: 'rechazada',  label: 'Rechazada' },
  { value: 'facturada',  label: 'Facturada' },
]

export default function CotizacionesDashboard() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [from, setFrom]                 = useState('')
  const [to, setTo]                     = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadCotizaciones = (params = {}) => {
    setLoading(true)
    setError(null)
    api.getCotizaciones(params)
      .then(data => {
        if (Array.isArray(data)) setCotizaciones(data)
        else setError('Error al cargar cotizaciones')
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCotizaciones() }, [])

  const handleBuscar = () => {
    const params = {}
    if (from) params.from = from
    if (to)   params.to   = to
    loadCotizaciones(params)
  }

  const handleLimpiar = () => {
    setFrom('')
    setTo('')
    setStatusFilter('')
    loadCotizaciones()
  }

  const handleAnular = async (cot) => {
    if (!window.confirm(`¿Anular la cotización ${cot.invoice_number}? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteCotizacion(cot.id)
      handleBuscar()
    } catch {
      alert('Error al anular la cotización')
    }
  }

  // Apply status filter client-side
  const displayed = statusFilter
    ? cotizaciones.filter(c => c.status === statusFilter)
    : cotizaciones

  // Stats
  const total      = cotizaciones.length
  const pendientes = cotizaciones.filter(c => c.status === 'pendiente').length
  const now = new Date()
  const facturadas = cotizaciones.filter(c => {
    if (c.status !== 'facturada' || !c.date) return false
    const [y, m] = c.date.split('-')
    return parseInt(y) === now.getFullYear() && parseInt(m) === now.getMonth() + 1
  }).length

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de cotizaciones y presupuestos</p>
        </div>
        <Link
          to="/nueva-cotizacion"
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ➕ Nueva Cotización
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleBuscar}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={handleLimpiar}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          Limpiar filtro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Cotizaciones</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{pendientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Facturadas este Mes</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{facturadas}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Listado de Cotizaciones</h2>
        </div>

        {loading && (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Cargando cotizaciones...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center text-red-500">
            <div className="text-4xl mb-3">⚠️</div>
            <p>{error}</p>
            <button
              onClick={() => loadCotizaciones()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium">No hay cotizaciones</p>
            <p className="text-sm mt-1">Crea tu primera cotización o ajusta los filtros</p>
          </div>
        )}

        {!loading && !error && displayed.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">No. Cotización</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Fecha</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Cliente</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((cot, idx) => (
                <tr
                  key={cot.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                >
                  <td className="px-4 py-3 font-mono text-gray-700 border-b border-gray-100">
                    {cot.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600 border-b border-gray-100">
                    {cot.date}
                  </td>
                  <td className="px-4 py-3 text-gray-700 border-b border-gray-100 max-w-xs truncate">
                    {cot.client_name}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 border-b border-gray-100">
                    L. {fmt(cot.total)}
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-100">
                    <StatusBadge status={cot.status} />
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-100">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/cotizacion/${cot.id}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        Ver
                      </Link>
                      {cot.status !== 'facturada' && cot.status !== 'anulada' && (
                        <button
                          onClick={() => handleAnular(cot)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
