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
  if (status === 'emitida') return <span className={`${base} bg-green-100 text-green-800`}>Emitida</span>
  if (status === 'anulada') return <span className={`${base} bg-red-100 text-red-800`}>Anulada</span>
  return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>
}

function TipoBadge({ invoice }) {
  if (invoice.from_cotizacion_number) {
    return (
      <span
        title={`Generada desde cotización: ${invoice.from_cotizacion_number}`}
        className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 cursor-help"
      >
        COT
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      Directa
    </span>
  )
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')

  const loadInvoices = (params = {}) => {
    setLoading(true)
    setError(null)
    api.getInvoices(params)
      .then(data => {
        if (Array.isArray(data)) setInvoices(data)
        else setError('Error al cargar facturas')
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadInvoices() }, [])

  const handleBuscar = () => {
    const params = {}
    if (from) params.from = from
    if (to)   params.to   = to
    loadInvoices(params)
  }

  const handleLimpiar = () => {
    setFrom('')
    setTo('')
    loadInvoices()
  }

  const handleAnular = async (invoice) => {
    if (!window.confirm(`¿Anular la factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteInvoice(invoice.id)
      handleBuscar()
    } catch {
      alert('Error al anular la factura')
    }
  }

  // Stats (based on currently loaded invoices)
  const emitidas = invoices.filter(i => i.status === 'emitida')
  const totalFacturado = emitidas.reduce((acc, i) => acc + parseFloat(i.total || 0), 0)

  const now = new Date()
  const thisMonth = invoices.filter(i => {
    if (!i.date) return false
    const [y, m] = i.date.split('-')
    return parseInt(y) === now.getFullYear() && parseInt(m) === now.getMonth() + 1
  }).length

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de facturas Honduras SAR</p>
        </div>
        <Link
          to="/nueva-factura"
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ➕ Nueva Factura
        </Link>
      </div>

      {/* Date range filter */}
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
          <p className="text-gray-500 text-sm">Total Facturas (emitidas)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{emitidas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Facturado</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">L. {fmt(totalFacturado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">facturas emitidas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Este Mes</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{thisMonth}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Listado de Facturas</h2>
        </div>

        {loading && (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Cargando facturas...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center text-red-500">
            <div className="text-4xl mb-3">⚠️</div>
            <p>{error}</p>
            <button
              onClick={() => loadInvoices()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && invoices.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium">No hay facturas</p>
            <p className="text-sm mt-1">Crea tu primera factura o ajusta el filtro de fechas</p>
          </div>
        )}

        {!loading && !error && invoices.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Tipo</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">No. Factura</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Fecha</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Cliente</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr
                  key={inv.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                >
                  <td className="px-4 py-3 border-b border-gray-100">
                    <TipoBadge invoice={inv} />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 border-b border-gray-100">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600 border-b border-gray-100">
                    {inv.date}
                  </td>
                  <td className="px-4 py-3 text-gray-700 border-b border-gray-100 max-w-xs truncate">
                    {inv.client_name}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 border-b border-gray-100">
                    L. {fmt(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-100">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-100">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/factura/${inv.id}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        Ver
                      </Link>
                      {inv.status !== 'anulada' && (
                        <button
                          onClick={() => handleAnular(inv)}
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
