import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'
import InvoiceTemplate from '../components/InvoiceTemplate'

export default function CotizacionRespuesta() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const initialAction = searchParams.get('action')

  const [cotizacion, setCotizacion] = useState(null)
  const [config, setConfig]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [step, setStep]             = useState('view')
  const [result, setResult]         = useState(null)
  const [reason, setReason]         = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getCotizacionPublica(token)
      .then(data => {
        if (data.error) { setError(data.error); return }
        const { _config, ...cot } = data
        setCotizacion(cot)
        setConfig(_config || {})
        if (initialAction === 'approve') handleApprove(cot)
        else if (initialAction === 'reject') setStep('reject-reason')
      })
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line

  const handleApprove = async (cot = cotizacion) => {
    if (!cot) return
    setSubmitting(true)
    try {
      const res = await api.responderCotizacion(token, { action: 'approve' })
      if (res.error) { setError(res.error); return }
      setResult({ type: 'approved', factura_id: res.factura_id })
      setStep('done')
    } catch {
      setError('Error al procesar la aprobación')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      const res = await api.responderCotizacion(token, { action: 'reject', rejection_reason: reason })
      if (res.error) { setError(res.error); return }
      setResult({ type: 'rejected' })
      setStep('done')
    } catch {
      setError('Error al procesar el rechazo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-lg">Cargando cotización...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no disponible</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (cotizacion?.status === 'facturada' || cotizacion?.status === 'aceptada') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Cotización ya aprobada</h2>
          <p className="text-gray-500 text-sm">Esta cotización ya fue aprobada anteriormente.</p>
        </div>
      </div>
    )
  }

  if (cotizacion?.status === 'rechazada') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Cotización ya rechazada</h2>
          <p className="text-gray-500 text-sm">Esta cotización fue rechazada anteriormente.</p>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {result?.type === 'approved' ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">¡Cotización Aprobada!</h2>
              <p className="text-gray-500 text-sm mb-4">
                Gracias por su aprobación. Hemos generado su factura y nos pondremos en contacto a la brevedad.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-700 text-sm font-medium">Su factura ha sido generada exitosamente.</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Respuesta Registrada</h2>
              <p className="text-gray-500 text-sm mb-4">
                Hemos recibido su respuesta. Nuestro equipo revisará sus comentarios y se pondrá en contacto.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-gray-600 text-sm font-medium">Gracias por su tiempo.</p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (step === 'reject-reason') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-4xl mb-3">📝</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Motivo del Rechazo</h2>
          <p className="text-gray-500 text-sm mb-5">
            Cotización <strong>{cotizacion?.invoice_number}</strong> — Por favor, comparta el motivo del rechazo.
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describa el motivo del rechazo..."
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
          />
          <div className="flex gap-3">
            <button onClick={() => setStep('view')}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleReject} disabled={!reason.trim() || submitting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Enviar Rechazo'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Action buttons — hidden on print */}
        <div className="no-print mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5">
          <p className="text-gray-700 font-semibold text-center mb-4">
            ¿Desea aprobar o rechazar esta cotización?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <button onClick={() => handleApprove()} disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50">
              ✓ Aprobar Cotización
            </button>
            <button onClick={() => setStep('reject-reason')} disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50">
              ✗ Rechazar Cotización
            </button>
          </div>
          <div className="text-center">
            <button onClick={() => window.print()}
              className="text-sm text-gray-400 hover:text-gray-600 underline">
              🖨 Imprimir / Guardar como PDF
            </button>
          </div>
        </div>

        {/* Full invoice document */}
        {cotizacion && config && (
          <InvoiceTemplate invoice={cotizacion} config={config} />
        )}
      </div>
    </div>
  )
}
