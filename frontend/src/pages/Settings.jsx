import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function TestEmailButton({ form }) {
  const [testing, setTesting] = useState(false)
  const handleTest = async () => {
    const to = form.smtp_user || window.prompt('Correo de destino para la prueba:')
    if (!to) return
    setTesting(true)
    try {
      const emailConfig = { provider: form.smtp_provider || 'gmail', user: form.smtp_user, pass: form.smtp_pass }
      const result = await api.testEmail(to, emailConfig)
      if (result?.error) alert('Error SMTP:\n\n' + result.error)
      else alert('✅ Correo de prueba enviado a ' + to + '\nRevisa tu bandeja de entrada (y spam).')
    } catch (err) {
      alert('Error de red o servidor:\n\n' + err.message)
    } finally {
      setTesting(false)
    }
  }
  return (
    <button type="button" onClick={handleTest} disabled={testing}
      className="mt-3 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
      {testing ? 'Enviando prueba…' : '✉️ Probar conexión SMTP'}
    </button>
  )
}

const COMPANY_FIELDS = [
  { key: 'company_name',    label: 'Nombre de la Empresa',   type: 'text'  },
  { key: 'company_address', label: 'Dirección',               type: 'text'  },
  { key: 'company_phone',   label: 'Teléfono',                type: 'text'  },
  { key: 'company_email',   label: 'Correo Electrónico',      type: 'email' },
  { key: 'company_rtn',     label: 'RTN',                     type: 'text'  },
]

const FISCAL_FIELDS = [
  { key: 'cai',                   label: 'CAI',                          type: 'text'   },
  { key: 'invoice_prefix',        label: 'Prefijo de Factura',           type: 'text'   },
  { key: 'invoice_sequence',      label: 'Número de Secuencia Actual',   type: 'number' },
  { key: 'authorized_range_from', label: 'Rango Autorizado Desde',       type: 'text'   },
  { key: 'authorized_range_to',   label: 'Rango Autorizado Hasta',       type: 'text'   },
  { key: 'emission_limit_date',   label: 'Fecha Límite de Emisión',      type: 'text'   },
]

export default function Settings() {
  const [form, setForm]       = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.getConfig()
      .then(cfg => { setForm(cfg); setLoading(false) })
      .catch(() => { setError('No se pudo cargar la configuración'); setLoading(false) })
  }, [])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSuccess(false)
    setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const result = await api.updateConfig(form)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Auto-hide success after 4s
        setTimeout(() => setSuccess(false), 4000)
      }
    } catch {
      setError('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="text-4xl mb-3">⏳</div>
        <p>Cargando configuración...</p>
      </div>
    )
  }

  const renderSection = (title, description, fields, icon) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h2 className="font-bold text-gray-800">{title}</h2>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <div
            key={field.key}
            className={field.key === 'company_address' || field.key === 'cai' ? 'sm:col-span-2' : ''}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <input
              type={field.type}
              value={form[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              className={inputCls}
              placeholder={field.label}
            />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona los datos de la empresa y la configuración fiscal
        </p>
      </div>

      <form onSubmit={handleSave}>
        {renderSection(
          'Datos de la Empresa',
          'Información que aparecerá en el encabezado de las facturas',
          COMPANY_FIELDS,
          '🏢'
        )}

        {renderSection(
          'Datos Fiscales',
          'Configuración de la numeración y autorización SAR',
          FISCAL_FIELDS,
          '📋'
        )}

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>⚠️ Nota:</strong> El número de secuencia actual determina el próximo número de factura.
          Cambiarlo manualmente puede causar duplicados. Modifícalo solo si es necesario.
        </div>

        {/* Email / SMTP config */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xl">✉️</span>
              <div>
                <h2 className="font-bold text-gray-800">Correo Saliente (SMTP)</h2>
                <p className="text-xs text-gray-500 mt-0.5">Usado para enviar cotizaciones a clientes. Se puede configurar por cotización también.</p>
              </div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.smtp_provider || 'gmail'} onChange={e => handleChange('smtp_provider', e.target.value)} className={inputCls}>
                <option value="gmail">Gmail (App Password)</option>
                <option value="yahoo">Yahoo</option>
                <option value="custom">SMTP Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (correo remitente)</label>
              <input type="email" value={form.smtp_user || ''} onChange={e => handleChange('smtp_user', e.target.value)} className={inputCls} placeholder="tu@correo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña / App Password</label>
              <input type="password" value={form.smtp_pass || ''} onChange={e => handleChange('smtp_pass', e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>
            {(form.smtp_provider === 'custom') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host SMTP</label>
                  <input value={form.smtp_host || ''} onChange={e => handleChange('smtp_host', e.target.value)} className={inputCls} placeholder="smtp.ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                  <input value={form.smtp_port || '587'} onChange={e => handleChange('smtp_port', e.target.value)} className={inputCls} placeholder="587" />
                </div>
              </>
            )}
          </div>
          {form.smtp_provider === 'gmail' && (
            <div className="mx-6 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
              Para Gmail, usa una <strong>App Password</strong> (no tu contraseña normal). Habilítala en: Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
            </div>
          )}
          <div className="px-6 pb-5">
            <TestEmailButton form={form} />
          </div>
        </div>

        {/* Success / Error messages */}
        {success && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
            <span className="text-lg">✅</span>
            <span>Configuración guardada exitosamente.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold rounded-xl transition-colors"
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}
