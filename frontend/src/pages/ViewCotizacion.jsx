import { useState, useEffect, useRef } from 'react'
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

const PROVIDERS = [
  { value: 'outlook_oauth2', label: 'Outlook Personal (OAuth2 — Recomendado)' },
  { value: 'gmail',          label: 'Gmail (App Password)' },
  { value: 'resend',         label: 'Resend (API Key)' },
  { value: 'yahoo',          label: 'Yahoo' },
  { value: 'custom',         label: 'SMTP Personalizado' },
]

function OutlookOAuthFlow({ onConnected }) {
  const [clientId, setClientId] = useState('')
  const [step, setStep]         = useState('clientid')
  const [flowData, setFlowData] = useState(null)
  const [polling, setPolling]   = useState(false)
  const [error, setError]       = useState(null)
  const pollRef = useRef(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  const handleInit = async () => {
    if (!clientId.trim()) { setError('Ingresa el Client ID de Azure'); return }
    setError(null)
    try {
      const res = await api.initOutlookAuth(clientId.trim())
      if (res.error) { setError(res.error); return }
      setFlowData(res)
      setStep('code')
      setPolling(true)
      pollRef.current = setInterval(async () => {
        try {
          const poll = await api.pollOutlookAuth()
          if (poll.status === 'authorized') {
            stopPolling()
            setPolling(false)
            setStep('done')
            onConnected()
          } else if (poll.status === 'expired') {
            stopPolling()
            setPolling(false)
            setError('El código expiró. Inicia el proceso de nuevo.')
            setStep('clientid')
          }
        } catch { /* keep polling */ }
      }, 5000)
    } catch (e) {
      setError(e.message || 'Error al iniciar autorización')
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  if (step === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-2xl mb-1">✅</div>
        <p className="text-green-800 font-semibold text-sm">Cuenta Outlook conectada</p>
        <p className="text-green-600 text-xs mt-1">Ya puedes enviar la cotización.</p>
      </div>
    )
  }

  if (step === 'code' && flowData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="text-blue-800 font-semibold text-sm">Paso 2: Autorizar en Microsoft</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Abre este enlace en tu navegador:</li>
        </ol>
        <a href={flowData.verification_uri} target="_blank" rel="noreferrer"
           className="block text-center px-3 py-2 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800">
          {flowData.verification_uri}
        </a>
        <div className="text-center">
          <p className="text-xs text-blue-600 mb-1">Ingresa este código:</p>
          <span className="text-2xl font-mono font-bold tracking-widest text-blue-900 bg-white border-2 border-blue-300 rounded-lg px-4 py-1">
            {flowData.user_code}
          </span>
        </div>
        {polling && (
          <p className="text-xs text-center text-blue-500 animate-pulse">Esperando autorización...</p>
        )}
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button type="button" onClick={() => { stopPolling(); setStep('clientid'); setError(null) }}
          className="text-xs text-blue-600 underline w-full text-center">
          Cancelar y volver
        </button>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <p className="text-amber-800 font-semibold text-sm">Configuración de Outlook Personal (OAuth2)</p>
      <div className="text-xs text-amber-700 space-y-1">
        <p><strong>Registro gratuito en Azure (solo una vez):</strong></p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Ve a <strong>portal.azure.com</strong> → "Registros de aplicaciones" → Nueva</li>
          <li>Tipo de cuenta: <strong>"Cuentas de Microsoft personales"</strong></li>
          <li>URI de redirección: deja vacío o pon <code className="bg-amber-100 px-1 rounded">https://login.microsoftonline.com/common/oauth2/nativeclient</code></li>
          <li>Copia el <strong>Id. de aplicación (cliente)</strong></li>
          <li>En "Autenticación" habilita <strong>"Flujos de cliente público"</strong></li>
        </ol>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Client ID de Azure *</label>
        <input value={clientId} onChange={e => setClientId(e.target.value)} className={inp}
               placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="button" onClick={handleInit}
        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg">
        Iniciar Autorización →
      </button>
    </div>
  )
}

function SendEmailModal({ cotizacion, onClose, onSent }) {
  const [clientEmail, setClientEmail]           = useState(cotizacion?.client_email || '')
  const [provider, setProvider]                 = useState('outlook_oauth2')
  const [user, setUser]                         = useState('')
  const [pass, setPass]                         = useState('')
  const [host, setHost]                         = useState('')
  const [port, setPort]                         = useState('587')
  const [outlookConnected, setOutlookConnected] = useState(false)
  const [checkingOutlook, setCheckingOutlook]   = useState(true)
  const [sending, setSending]                   = useState(false)
  const [error, setError]                       = useState(null)

  useEffect(() => {
    Promise.all([
      api.getConfig().catch(() => null),
      api.getOutlookStatus().catch(() => null),
    ]).then(([cfg, outlook]) => {
      if (cfg?.smtp_user) {
        setProvider(cfg.smtp_provider || 'gmail')
        setUser(cfg.smtp_user)
        setPass(cfg.smtp_pass || '')
        setHost(cfg.smtp_host || '')
        setPort(cfg.smtp_port || '587')
      }
      setOutlookConnected(!!(outlook?.connected))
    }).finally(() => setCheckingOutlook(false))
  }, [])

  const handleDisconnectOutlook = async () => {
    await api.disconnectOutlook().catch(() => {})
    setOutlookConnected(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!clientEmail.trim()) { setError('El correo del cliente es requerido'); return }
    if (provider !== 'outlook_oauth2' && (!user.trim() || !pass.trim())) {
      setError('Usuario y contraseña del correo son requeridos'); return
    }
    setSending(true)
    setError(null)
    try {
      const emailConfig = provider === 'outlook_oauth2'
        ? { provider: 'outlook_oauth2' }
        : { provider, user, pass, host, port }
      const baseUrl = window.location.origin
      const res = await api.enviarCotizacion(cotizacion._id, { clientEmail, emailConfig, baseUrl })
      if (res.error) { setError(res.error); return }
      onSent(res.email_sent_to)
    } catch {
      setError('Error al enviar el correo')
    } finally {
      setSending(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  const isOutlook = provider === 'outlook_oauth2'
  const sendDisabled = sending || (isOutlook && !outlookConnected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-800">Enviar Cotización por Correo</h2>
            <p className="text-xs text-gray-400">{cotizacion?.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo del Cliente *</label>
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                   className={inp} placeholder="cliente@empresa.com" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Configuración de Envío</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor de Correo</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} className={inp}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {isOutlook && !checkingOutlook && (
                outlookConnected ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-green-800 text-xs font-semibold">✓ Cuenta Outlook conectada</span>
                    <button type="button" onClick={handleDisconnectOutlook}
                      className="text-xs text-red-600 hover:underline">Desconectar</button>
                  </div>
                ) : (
                  <OutlookOAuthFlow onConnected={() => setOutlookConnected(true)} />
                )
              )}

              {!isOutlook && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tu correo (remitente)</label>
                    <input type="email" value={user} onChange={e => setUser(e.target.value)}
                           className={inp} placeholder="tu@correo.com" autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {provider === 'gmail' ? 'Contraseña de App (App Password)' : provider === 'resend' ? 'API Key (re_...)' : 'Contraseña'}
                    </label>
                    <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                           className={inp} placeholder="••••••••" autoComplete="new-password" />
                  </div>
                  {provider === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Host SMTP</label>
                        <input value={host} onChange={e => setHost(e.target.value)}
                               className={inp} placeholder="smtp.ejemplo.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Puerto</label>
                        <input value={port} onChange={e => setPort(e.target.value)}
                               className={inp} placeholder="587" />
                      </div>
                    </div>
                  )}
                  {provider === 'gmail' && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      Usa una <strong>App Password</strong> (no tu contraseña normal). Actívala en: Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
                    </p>
                  )}
                  {provider === 'resend' && (
                    <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                      <strong>Correo remitente</strong> = email de tu dominio verificado en resend.com. <strong>Contraseña</strong> = API Key (<code>re_...</code>).
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={sendDisabled}
              className="flex-1 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 bg-blue-700 hover:bg-blue-800">
              {sending ? 'Enviando...' : '✉ Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ViewCotizacion() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cotizacion, setCotizacion] = useState(null)
  const [config, setConfig]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [converting, setConverting] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSentTo, setEmailSentTo]       = useState(null)

  useEffect(() => {
    Promise.all([api.getCotizacion(id), api.getConfig()])
      .then(([cot, cfg]) => {
        if (cot.error) { setError(cot.error); return }
        setCotizacion(cot)
        setConfig(cfg)
        if (cot.email_sent_to) setEmailSentTo(cot.email_sent_to)
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
      navigate(`/factura/${factura.id || factura._id}`)
    } catch {
      alert('Error al convertir la cotización')
      setConverting(false)
    }
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
  const canEdit    = status !== 'facturada' && status !== 'anulada'
  const canConvert = status !== 'facturada' && status !== 'anulada'
  const canEmail   = status !== 'facturada' && status !== 'anulada'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/cotizaciones" className="text-gray-600 hover:text-gray-900 text-sm font-medium">← Volver</Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-mono text-gray-700 font-semibold">{cotizacion?.invoice_number}</span>
            {cotizacion && <StatusBadge status={status} />}
            {emailSentTo && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                ✉ Enviado a {emailSentTo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {status === 'pendiente' && (
              <button onClick={handleAceptar}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg">
                Aceptar
              </button>
            )}
            {canChangeStatus && (
              <button onClick={handleRechazar}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg">
                Rechazar
              </button>
            )}
            {canEmail && (
              <button onClick={() => setShowEmailModal(true)}
                className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg">
                ✉ Enviar al Cliente
              </button>
            )}
            {canEdit && (
              <button onClick={() => navigate(`/editar-cotizacion/${id}`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg">
                Editar
              </button>
            )}
            {canConvert && (
              <button onClick={handleConvertir} disabled={converting}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg">
                {converting ? 'Procesando...' : 'Crear Factura'}
              </button>
            )}
            {status === 'facturada' && cotizacion?.converted_invoice_id && (
              <Link to={`/factura/${cotizacion.converted_invoice_id}`}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">
                Ver Factura
              </Link>
            )}
            <div className="flex flex-col items-end">
              <button onClick={() => window.print()}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                Imprimir / PDF
              </button>
              <span className="text-xs text-gray-400 mt-0.5">(Ctrl+P → Guardar como PDF)</span>
            </div>
          </div>
        </div>

        {/* Rejection reason banner */}
        {status === 'rechazada' && cotizacion?.rejection_reason && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
            <strong>Motivo de rechazo:</strong> {cotizacion.rejection_reason}
          </div>
        )}
      </div>

      <div className="p-6 flex justify-center">
        <div className="w-full max-w-4xl">
          {cotizacion && config && (
            <InvoiceTemplate invoice={cotizacion} config={config} />
          )}
        </div>
      </div>

      {showEmailModal && (
        <SendEmailModal
          cotizacion={cotizacion}
          onClose={() => setShowEmailModal(false)}
          onSent={(email) => {
            setEmailSentTo(email)
            setShowEmailModal(false)
            alert(`Cotización enviada exitosamente a ${email}`)
          }}
        />
      )}
    </div>
  )
}
