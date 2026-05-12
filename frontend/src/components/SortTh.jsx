export function SortTh({ label, col, sortKey, sortDir, onSort, align = 'left', className = '' }) {
  const active = sortKey === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors text-${align} ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-xs text-gray-400">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}

export function sortRows(rows, key, dir) {
  if (!key || !Array.isArray(rows)) return rows
  return [...rows].sort((a, b) => {
    let va = a[key] ?? ''
    let vb = b[key] ?? ''
    if (typeof va === 'number' || typeof vb === 'number' || key === 'total' || key === 'monto' || key === 'total_facturado' || key === 'total_facturas' || key === 'total_cotizaciones') {
      va = parseFloat(va) || 0
      vb = parseFloat(vb) || 0
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}
