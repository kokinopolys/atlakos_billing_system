import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BLUE = '#1e40af'

export default function Finanzas() {
  const today    = new Date().toLocaleDateString('en-CA')
  const yearFrom = today.slice(0, 4) + '-01-01'

  const [from, setFrom]       = useState(yearFrom)
  const [to, setTo]           = useState(today)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (from) params.from = from
      if (to)   params.to   = to
      const res = await api.getResumenFinanciero(params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  return (
    <div>
      <div className="px-6 py-4" style={{ backgroundColor: BLUE }}>
        <h1 className="text-xl font-bold text-white">Resumen Financiero</h1>
        <p className="text-blue-300 text-sm">Ingresos, gastos y utilidad</p>
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

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando finanzas...</div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Ingresos</p>
                <p className="text-2xl font-black text-green-600">L. {fmt(data.total_ingresos)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Gastos</p>
                <p className="text-2xl font-black text-red-500">L. {fmt(data.total_gastos)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">ISV Cobrado</p>
                <p className="text-2xl font-black text-orange-500">L. {fmt(data.total_isv)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Utilidad Bruta</p>
                <p className={`text-2xl font-black ${data.utilidad_bruta >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  L. {fmt(data.utilidad_bruta)}
                </p>
              </div>
            </div>

            {/* Monthly table */}
            {(data.meses || []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="font-bold text-gray-700 text-sm">Detalle Mensual</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mes</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ingresos</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Gastos</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Utilidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.meses.map(m => (
                        <tr key={m.month} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-700">{m.month}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">L. {fmt(m.ingresos)}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-semibold">L. {fmt(m.gastos)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${m.utilidad >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            L. {fmt(m.utilidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
