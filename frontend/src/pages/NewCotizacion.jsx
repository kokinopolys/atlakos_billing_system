import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import InvoiceTemplate from '../components/InvoiceTemplate'

const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const today = () => new Date().toISOString().split('T')[0]

const emptyItem = () => ({ qty: '', description: '', unitPrice: '' })

function calcTotals(items, taxIncluded, ve = 0, se = 0, desc = 0) {
  const rawSum = items.reduce((acc, item) => {
    return acc + (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
  }, 0)

  const ventaExonerada = parseFloat(ve) || 0
  const subtotalExento = parseFloat(se) || 0
  const descuentos     = parseFloat(desc) || 0

  let subtotalGravado, isv, total

  if (!taxIncluded) {
    subtotalGravado    = rawSum - ventaExonerada - subtotalExento - descuentos
    const totalGravado = subtotalGravado / 0.85
    isv   = totalGravado - subtotalGravado
    total = ventaExonerada + subtotalExento + totalGravado
  } else {
    const rawGravado = rawSum - ventaExonerada - subtotalExento - descuentos
    subtotalGravado  = rawGravado / 1.15
    isv   = rawGravado - subtotalGravado
    total = ventaExonerada + subtotalExento + rawGravado
  }

  return {
    subtotalGravado: Math.round(subtotalGravado * 100) / 100,
    isv:             Math.round(isv * 100) / 100,
    total:           Math.round(total * 100) / 100,
  }
}

const ONES_ES = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS',
  'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
]
const TENS_ES = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const HUNDREDS_ES = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function convertH(n) {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const h = Math.floor(n / 100)
  const r = n % 100
  let w = h > 0 ? HUNDREDS_ES[h] : ''
  if (r === 0) return w.trim()
  if (w) w += ' '
  if (r < 30) return (w + ONES_ES[r]).trim()
  const t = Math.floor(r / 10), o = r % 10
  return (w + TENS_ES[t] + (o > 0 ? ' Y ' + ONES_ES[o] : '')).trim()
}

function previewWords(amount) {
  const rounded = Math.round(parseFloat(amount || 0) * 100) / 100
  const int = Math.floor(rounded)
  const dec = Math.round((rounded - int) * 100)
  let w = ''
  if (int === 0) w = 'CERO'
  else if (int >= 1000000) {
    const m = Math.floor(int / 1000000)
    const r = int % 1000000
    w = (m === 1 ? 'UN MILLÓN' : convertH(m) + ' MILLONES') + (r > 0 ? ' ' + previewWords(r).split(' LEMPIRAS')[0] : '')
  } else if (int >= 1000) {
    const th = Math.floor(int / 1000)
    const r = int % 1000
    w = (th === 1 ? 'MIL' : convertH(th) + ' MIL') + (r > 0 ? ' ' + convertH(r) : '')
  } else {
    w = convertH(int)
  }
  return `${w} LEMPIRAS CON ${String(dec).padStart(2, '0')}/100 CTVS`
}

export default function NewCotizacion() {
  const navigate = useNavigate()

  const [config, setConfig]                 = useState(null)
  const [date, setDate]                     = useState(today())
  const [clientName, setClientName]         = useState('')
  const [clientAddress, setClientAddress]   = useState('')
  const [clientRtn, setClientRtn]           = useState('')
  const [taxIncluded, setTaxIncluded]       = useState(null)
  const [items, setItems]                   = useState([emptyItem()])
  const [ventaExonerada, setVentaExonerada] = useState('')
  const [subtotalExento, setSubtotalExento] = useState('')
  const [descuentos, setDescuentos]         = useState('')
  const [noOcExenta, setNoOcExenta]         = useState('')
  const [noRegistroExonerado, setNoRegistroExonerado] = useState('')
  const [noRegistroSag, setNoRegistroSag]   = useState('')
  const [showOptional, setShowOptional]     = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [errors, setErrors]                 = useState({})

  useEffect(() => {
    api.getConfig().then(c => setConfig(c)).catch(() => {})
  }, [])

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totals = taxIncluded !== null
    ? calcTotals(items, taxIncluded, ventaExonerada, subtotalExento, descuentos)
    : { subtotalGravado: 0, isv: 0, total: 0 }

  const sumaEnLetras = previewWords(totals.total)

  const previewInvoice = {
    invoice_number: config
      ? `${config.cotizacion_prefix || 'COT'}-${String(parseInt(config.cotizacion_sequence || 1)).padStart(6, '0')}`
      : 'COT-000001',
    doc_type: 'cotizacion',
    date,
    client_name: clientName || 'Cliente',
    client_address: clientAddress,
    client_rtn: clientRtn,
    items,
    tax_included: taxIncluded === true,
    venta_exonerada: ventaExonerada,
    subtotal_exento: subtotalExento,
    descuentos,
    subtotal_gravado: totals.subtotalGravado,
    isv: totals.isv,
    total: totals.total,
    suma_en_letras: sumaEnLetras,
    no_oc_exenta: noOcExenta,
    no_registro_exonerado: noRegistroExonerado,
    no_registro_sag: noRegistroSag,
  }

  const validate = () => {
    const e = {}
    if (!date) e.date = 'La fecha es requerida'
    if (!clientName.trim()) e.clientName = 'El nombre del cliente es requerido'
    if (taxIncluded === null) e.taxIncluded = 'Debe seleccionar el tipo de ISV'
    const validItems = items.filter(it => it.qty && it.description && it.unitPrice)
    if (validItems.length === 0) e.items = 'Agregue al menos una línea de detalle completa'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)

    const validItems = items.filter(it => it.qty && it.description && it.unitPrice)

    try {
      const result = await api.createCotizacion({
        date,
        clientName,
        clientAddress,
        clientRtn,
        items: validItems.map(it => ({
          qty: parseFloat(it.qty),
          description: it.description,
          unitPrice: parseFloat(it.unitPrice),
        })),
        taxIncluded,
        ventaExonerada: parseFloat(ventaExonerada) || 0,
        subtotalExento: parseFloat(subtotalExento) || 0,
        descuentos: parseFloat(descuentos) || 0,
        noOcExenta,
        noRegistroExonerado,
        noRegistroSag,
      })

      if (result.error) { alert(`Error: ${result.error}`); setSubmitting(false); return }
      navigate(`/cotizacion/${result.id}`)
    } catch {
      alert('Error al conectar con el servidor')
      setSubmitting(false)
    }
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      err ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT PANEL: Form */}
      <div className="w-1/2 overflow-y-auto p-5 border-r border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Nueva Cotización</h1>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls(errors.date)}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Cliente */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm">Datos del Cliente</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Señor(es) / Nombre *</label>
              <input
                type="text"
                placeholder="Nombre completo o razón social"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className={inputCls(errors.clientName)}
              />
              {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Dirección del cliente"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                className={inputCls(false)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RTN</label>
              <input
                type="text"
                placeholder="Número RTN del cliente"
                value={clientRtn}
                onChange={e => setClientRtn(e.target.value)}
                className={inputCls(false)}
              />
            </div>
          </div>

          {/* Tipo de ISV */}
          <div className={`rounded-xl p-4 border-2 ${errors.taxIncluded ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <h2 className="font-semibold text-gray-700 text-sm mb-3">Tipo de ISV *</h2>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                taxIncluded === false ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="taxIncluded"
                  value="false"
                  checked={taxIncluded === false}
                  onChange={() => setTaxIncluded(false)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium text-sm text-gray-800">ISV No Incluido</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    El precio que ingrese es sin ISV. Se calculará: <strong>Total = Precio ÷ 0.85</strong>
                  </p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                taxIncluded === true ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="taxIncluded"
                  value="true"
                  checked={taxIncluded === true}
                  onChange={() => setTaxIncluded(true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium text-sm text-gray-800">ISV Incluido</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    El precio que ingrese ya incluye ISV. Se extraerá: <strong>ISV = Total ÷ 1.15 × 0.15</strong>
                  </p>
                </div>
              </label>
            </div>
            {errors.taxIncluded && <p className="text-red-500 text-xs mt-2">{errors.taxIncluded}</p>}
          </div>

          {/* Items */}
          <div>
            <h2 className="font-semibold text-gray-700 text-sm mb-2">Líneas de Detalle *</h2>
            {errors.items && <p className="text-red-500 text-xs mb-2">{errors.items}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white">
                    <th className="px-2 py-2 text-left font-semibold border border-amber-500" style={{ width: '70px' }}>Cantidad</th>
                    <th className="px-2 py-2 text-left font-semibold border border-amber-500">Descripción</th>
                    <th className="px-2 py-2 text-right font-semibold border border-amber-500" style={{ width: '110px' }}>Precio Unit.</th>
                    <th className="px-2 py-2 text-right font-semibold border border-amber-500" style={{ width: '100px' }}>Valor Total</th>
                    <th className="px-2 py-2 border border-amber-500" style={{ width: '32px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 p-0">
                          <input
                            type="number" min="0" step="any" placeholder="0"
                            value={item.qty}
                            onChange={e => updateItem(idx, 'qty', e.target.value)}
                            className="w-full px-2 py-2 text-right bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-xs"
                          />
                        </td>
                        <td className="border border-gray-200 p-0">
                          <input
                            type="text" placeholder="Descripción del producto o servicio"
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            className="w-full px-2 py-2 bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-xs"
                          />
                        </td>
                        <td className="border border-gray-200 p-0">
                          <input
                            type="number" min="0" step="any" placeholder="0.00"
                            value={item.unitPrice}
                            onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-2 text-right bg-transparent border-0 focus:outline-none focus:bg-amber-50 text-xs"
                          />
                        </td>
                        <td className="border border-gray-200 px-2 py-2 text-right font-medium text-gray-700">
                          {rowTotal > 0 ? `L. ${fmt(rowTotal)}` : '—'}
                        </td>
                        <td className="border border-gray-200 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="w-full h-full px-1 py-2 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              ➕ Agregar Línea
            </button>
          </div>

          {/* Totals preview */}
          {taxIncluded !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Resumen de Totales</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sub-Total Gravado</span>
                  <span>L. {fmt(totals.subtotalGravado)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>15% ISV</span>
                  <span>L. {fmt(totals.isv)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-amber-300 pt-2 mt-2">
                  <span>TOTAL</span>
                  <span className="text-amber-700">L. {fmt(totals.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Campos Opcionales */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>Campos Opcionales (Exoneraciones y otros)</span>
              <span>{showOptional ? '▲' : '▼'}</span>
            </button>

            {showOptional && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Venta Exonerada</label>
                    <input type="number" min="0" step="any" placeholder="0.00"
                      value={ventaExonerada} onChange={e => setVentaExonerada(e.target.value)}
                      className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sub-Total Exento</label>
                    <input type="number" min="0" step="any" placeholder="0.00"
                      value={subtotalExento} onChange={e => setSubtotalExento(e.target.value)}
                      className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descuentos y Rebajas</label>
                    <input type="number" min="0" step="any" placeholder="0.00"
                      value={descuentos} onChange={e => setDescuentos(e.target.value)}
                      className={inputCls(false)} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">Datos del Adquirente Exonerado</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">No. O/C Exenta</label>
                      <input type="text" value={noOcExenta} onChange={e => setNoOcExenta(e.target.value)} className={inputCls(false)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">No. Registro de Exonerado</label>
                      <input type="text" value={noRegistroExonerado} onChange={e => setNoRegistroExonerado(e.target.value)} className={inputCls(false)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">No. Registro de la SAG</label>
                      <input type="text" value={noRegistroSag} onChange={e => setNoRegistroSag(e.target.value)} className={inputCls(false)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-sm rounded-xl transition-colors"
          >
            {submitting ? 'Generando...' : '✅ Crear Cotización'}
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Live Preview */}
      <div className="w-1/2 overflow-y-auto bg-gray-100 p-4">
        <div className="mb-3">
          <h2 className="font-semibold text-gray-700 text-sm">Vista Previa</h2>
          <p className="text-xs text-gray-400 mt-0.5">Vista previa — Los totales se confirman al guardar</p>
        </div>
        <div className="overflow-x-auto">
          <InvoiceTemplate invoice={previewInvoice} config={config || {}} />
        </div>
      </div>
    </div>
  )
}
