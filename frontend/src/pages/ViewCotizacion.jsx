import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../utils/api'
import InvoiceTemplate from '../components/InvoiceTemplate'

function StatusBadge({ status }) {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'
  if (status === 'pendiente')  return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendiente</span>
  if (status === 'aceptada')   return <span className={`${base} bg-green-100 text-green-800`}>Aceptada</span>
  if (status === 'rechazada')  return <span className={`${base} bg-red-100 text-red-800`}>Rechazada</span>
  if (status === 'facturada')  return <span className={`${base} bg-blue-100 text-blue-800`}>Facturada</span>
  return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>
}

export default function ViewCotizacion() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cotizacion, setCotizacion] = useState(null)
  const [config, setConfig]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    Promise.all([api.getCotizacion(id), api.getConfig()])
      .then(([cot, cfg]) => {
        if (cot.error) { setError(cot.error); return }
        setCotizacion(cot)
        setConfig(cfg)
      })
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAceptar = async () => {
    try {
      const updated = await api.updateCotizacionStatus(id, 'aceptada')
      if (updated.error) { alert(`Error: ${updated.error}`); return }
      setCotizacion(updated)
    } catch {
      alert('Error al actualizar el estado')
    }
  }

  const handleRechazar = async () => {
    if (!window.confirm('¿Marcar esta cotización como rechazada?')) return
    try {
      const updated = await api.updateCotizacionStatus(id, 'rechazada')
      if (updated.error) { alert(`Error: ${updated.error}`); return }
      setCotizacion(updated)
    } catch {
      alert('Error al actualizar el estado')
    }
  }

  const handleConvertir = async () => {
    if (!window.confirm('¿Convertir esta cotización a factura? Se generará una nueva factura con número fiscal.')) return
    setConverting(true)
    try {
      const factura = await api.convertToFactura(id)
      if (factura.error) { alert(`Error: ${factura.error}`); setConverting(false); return }
      navigate(`/factura/${factura.id}`)
    } catch {
      alert('Error al convertir la cotización')
      setConverting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="text-5xl mb-4">⏳</div>
        <p>Cargando cotización...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center text-red-500">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-medium">{error}</p>
        <Link to="/cotizaciones" className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
          Volver a cotizaciones
        </Link>
      </div>
    )
  }

  const status = cotizacion?.status
  const canChangeStatus = status !== 'facturada' && status !== 'rechazada' && status !== 'anulada'
  const canEdit = status !== 'facturada' && status !== 'anulada'
  const canConvert = status !== 'facturada' && status !== 'anulada'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: back + number + status */}
          <div className="flex items-center gap-3">
            <Link
              to="/cotizaciones"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Volver
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-mono text-gray-700 font-semibold">
              {cotizacion?.invoice_number}
            </span>
            {cotizacion && <StatusBadge status={status} />}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Aceptar (only if pendiente) */}
            {status === 'pendiente' && (
              <button
                onClick={handleAceptar}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                Aceptar
              </button>
            )}

            {/* Rechazar (if pendiente or aceptada) */}
            {canChangeStatus && (
              <button
                onClick={handleRechazar}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                Rechazar
              </button>
            )}

            {/* Editar */}
            {canEdit && (
              <button
                onClick={() => navigate(`/editar-cotizacion/${id}`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                Editar
              </button>
            )}

            {/* Crear Factura */}
            {canConvert && (
              <button
                onClick={handleConvertir}
                disabled={converting}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors"
              >
                {converting ? 'Procesando...' : 'Crear Factura'}
              </button>
            )}

            {/* Ver Factura (if already facturada) */}
            {status === 'facturada' && cotizacion?.converted_invoice_id && (
              <Link
                to={`/factura/${cotizacion.converted_invoice_id}`}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Ver Factura
              </Link>
            )}

            {/* Print */}
            <div className="flex flex-col items-end">
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                Imprimir / PDF
              </button>
              <span className="text-xs text-gray-400 mt-0.5">(Ctrl+P → Guardar como PDF)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cotización content */}
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-4xl">
          {cotizacion && config && (
            <InvoiceTemplate invoice={cotizacion} config={config} />
          )}
        </div>
      </div>
    </div>
  )
}
