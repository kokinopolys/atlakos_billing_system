import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BLUE = '#1e40af'

const TABS = [
  { key: 'resumen',  label: 'Resumen'        },
  { key: 'clientes', label: 'Por Cliente'    },
  { key: 'fechas',   label: 'Por Fecha'      },
  { key: 'servicios',label: 'Por Servicio'   },
]

export default function Reportes() {
  const today = new Date().toLocaleDateString('en-CA')
  const firstDay = today.slice(0, 7) + '-01'

  const [tab, setTab]         = useState('resumen')
  const [from, setFrom]       = useState(firstDay)
  const [to, setTo]           = useState(today)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const params = {}
      if (from) params.from = from
      if (to)   params.to   = to
      let res
      if (tab === 'resumen')   res = await api.getReporteResumen(params)
      if (tab === 'clientes')  res = await api.getReportePorCliente(params)
      if (tab === 'fechas')    res = await api.getReportePorFecha(params)
      if (tab === 'servicios') res = await api.getReportePorServicio(params)
      if (res?.error) { setError(res.error); setData(null) }
      else setData(res)
    } catch {
      setError('No se pudo conectar con el servidor')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab]) // eslint-disable-line

  return (
    <div>
      <div className="px-6 py-4" style={{ backgroundColor: BLUE }}>
        <h1 className="text-xl font-bold text-white">Reportería</h1>
        <p className="text-blue-300 text-sm">Análisis de ventas y cotizaciones</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: BLUE }}>
            Actualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setData(null); setTab(t.key) }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={tab === t.key ? { backgroundColor: BLUE, color: '#fff' } : { color: '#6b7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando reporte...</div>
        ) : (
          <>
            {/* Resumen */}
            {tab === 'resumen' && data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Facturas Emitidas', value: data.total_facturas, prefix: '', suffix: '' },
                    { label: 'Total Ventas', value: `L. ${fmt(data.total_ventas)}`, prefix: '', suffix: '' },
                    { label: 'Total ISV', value: `L. ${fmt(data.total_isv)}`, prefix: '', suffix: '' },
                    { label: 'Cotizaciones', value: data.total_cotizaciones, prefix: '', suffix: '' },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">{card.label}</p>
                      <p className="text-2xl font-black text-gray-800">{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Cotizaciones Aceptadas</p>
                    <p className="text-2xl font-black text-green-600">{data.cot_aceptadas}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Cotizaciones Facturadas</p>
                    <p className="text-2xl font-black" style={{ color: BLUE }}>{data.cot_facturadas}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Tasa de Conversión</p>
                    <p className="text-2xl font-black text-gray-800">{data.tasa_conversion}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Por cliente */}
            {tab === 'clientes' && (
              <ReporteTable
                rows={data || []}
                cols={[
                  { key: 'client_name', label: 'Cliente', align: 'left' },
                  { key: 'count', label: 'Facturas', align: 'center' },
                  { key: 'total', label: 'Total', align: 'right', fmt: true },
                ]}
              />
            )}

            {/* Por fecha */}
            {tab === 'fechas' && (
              <ReporteTable
                rows={data || []}
                cols={[
                  { key: 'date', label: 'Fecha', align: 'left' },
                  { key: 'count', label: 'Facturas', align: 'center' },
                  { key: 'total', label: 'Total', align: 'right', fmt: true },
                ]}
              />
            )}

            {/* Por servicio */}
            {tab === 'servicios' && (
              <ReporteTable
                rows={data || []}
                cols={[
                  { key: 'description', label: 'Servicio', align: 'left' },
                  { key: 'qty', label: 'Qty', align: 'center' },
                  { key: 'total', label: 'Total', align: 'right', fmt: true },
                ]}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ReporteTable({ rows, cols }) {
  const safeRows = Array.isArray(rows) ? rows : []
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {cols.map(c => (
                <th key={c.key} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-${c.align}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safeRows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {cols.map(c => (
                  <td key={c.key} className={`px-4 py-3 text-${c.align} ${c.align === 'right' ? 'font-semibold text-blue-800' : 'text-gray-700'}`}>
                    {c.fmt ? `L. ${fmt(row[c.key])}` : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {safeRows.length === 0 && (
              <tr><td colSpan={cols.length} className="text-center text-gray-400 py-10">Sin datos en este período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
