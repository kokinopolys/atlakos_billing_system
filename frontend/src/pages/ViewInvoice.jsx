import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import InvoiceTemplate from '../components/InvoiceTemplate'

function StatusBadge({ status }) {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'
  if (status === 'emitida') return <span className={`${base} bg-green-100 text-green-800`}>Emitida</span>
  if (status === 'anulada') return <span className={`${base} bg-red-100 text-red-800`}>Anulada</span>
  return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>
}

export default function ViewInvoice() {
  const { id } = useParams()

  const [invoice, setInvoice] = useState(null)
  const [config, setConfig]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    Promise.all([api.getInvoice(id), api.getConfig()])
      .then(([inv, cfg]) => {
        if (inv.error) { setError(inv.error); return }
        setInvoice(inv)
        setConfig(cfg)
      })
      .catch(() => setError('No se pudo cargar la factura'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAnular = async () => {
    if (!invoice) return
    if (!window.confirm(`¿Anular factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`)) return
    try {
      const result = await api.deleteInvoice(invoice.id)
      if (result.success) setInvoice(result.invoice)
    } catch {
      alert('Error al anular la factura')
    }
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="text-5xl mb-4">⏳</div>
        <p>Cargando factura...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center text-red-500">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-medium">{error}</p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
          Volver al listado
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Volver
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-mono text-gray-700 font-semibold">
            {invoice?.invoice_number}
          </span>
          {invoice && <StatusBadge status={invoice.status} />}
        </div>

        <div className="flex items-center gap-3">
          {invoice?.status !== 'anulada' && (
            <button
              onClick={handleAnular}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              Anular Factura
            </button>
          )}
          <div className="flex flex-col items-end">
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              🖨️ Imprimir / PDF
            </button>
            <span className="text-xs text-gray-400 mt-0.5">(Ctrl+P → Guardar como PDF)</span>
          </div>
        </div>
      </div>

      {/* Cotización origin banner */}
      {invoice?.from_cotizacion_number && (
        <div className="no-print mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <span>📋</span>
          <span>
            Generada desde Cotización: <strong className="font-mono">{invoice.from_cotizacion_number}</strong>
          </span>
        </div>
      )}

      {/* Invoice */}
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-4xl">
          {invoice && config && (
            <InvoiceTemplate invoice={invoice} config={config} />
          )}
        </div>
      </div>
    </div>
  )
}
