import React from 'react'

// Format number as L. 1,234.56
const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// Format date as "18 de marzo de 2026"
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

function formatDateES(dateStr) {
  if (!dateStr) return ''
  // dateStr can be 'YYYY-MM-DD' or already a formatted string
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${parseInt(d)} de ${MONTHS_ES[parseInt(m) - 1]} de ${y}`
  }
  return dateStr
}

const MIN_ROWS = 8

export default function InvoiceTemplate({ invoice, config }) {
  if (!invoice || !config) {
    return (
      <div className="invoice-page p-6 text-gray-400 text-center">
        Cargando vista previa...
      </div>
    )
  }

  const items = Array.isArray(invoice.items) ? invoice.items : []

  // Pad to minimum rows
  const displayRows = [...items]
  while (displayRows.length < MIN_ROWS) {
    displayRows.push({ qty: '', description: '', unitPrice: '' })
  }

  const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber || ''
  const clientName    = invoice.client_name    || invoice.clientName    || ''
  const clientAddress = invoice.client_address || invoice.clientAddress || ''
  const clientRtn     = invoice.client_rtn     || invoice.clientRtn     || ''

  const ventaExonerada  = parseFloat(invoice.venta_exonerada  || invoice.ventaExonerada  || 0)
  const subtotalExento  = parseFloat(invoice.subtotal_exento  || invoice.subtotalExento  || 0)
  const descuentos      = parseFloat(invoice.descuentos       || 0)
  const subtotalGravado = parseFloat(invoice.subtotal_gravado || invoice.subtotalGravado || 0)
  const isv             = parseFloat(invoice.isv              || 0)
  const total           = parseFloat(invoice.total            || 0)
  const sumaEnLetras    = invoice.suma_en_letras || invoice.sumaEnLetras || ''

  const noOcExenta          = invoice.no_oc_exenta          || invoice.noOcExenta          || ''
  const noRegistroExonerado = invoice.no_registro_exonerado || invoice.noRegistroExonerado || ''
  const noRegistroSag       = invoice.no_registro_sag       || invoice.noRegistroSag       || ''

  const companyName    = config.company_name    || 'MRS DEVS S. DE R. L.'
  const companyAddress = config.company_address || ''
  const companyPhone   = config.company_phone   || ''
  const companyEmail   = config.company_email   || ''
  const companyRtn     = config.company_rtn     || ''
  const cai            = config.cai             || ''
  const emissionLimit  = config.emission_limit_date || ''
  const rangeFrom      = config.authorized_range_from || ''
  const rangeTo        = config.authorized_range_to   || ''
  const docType        = invoice.doc_type || 'factura'
  const isCotizacion   = docType === 'cotizacion'

  const cell = 'border border-gray-400 px-1 py-0.5'
  const thCell = `${cell} bg-blue-700 text-white text-center font-semibold`

  return (
    <div
      id="invoice-print"
      className="invoice-page bg-white"
      style={{
        maxWidth: '210mm',
        width: '100%',
        minHeight: '270mm',
        margin: '0 auto',
        padding: '8mm',
        border: '2px solid #374151',
        boxSizing: 'border-box',
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* ── HEADER ROW ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody>
          <tr>
            {/* LEFT: Company Info */}
            <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                {companyName}
              </div>
              <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>
                <div>{companyAddress}</div>
                <div>Tel: {companyPhone}</div>
                <div>{companyEmail}</div>
              </div>
            </td>

            {/* RIGHT: FACTURA / COTIZACIÓN info */}
            <td style={{ width: '45%', verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ color: isCotizacion ? '#d97706' : '#dc2626', fontWeight: 'bold', fontSize: '22px', lineHeight: '1.1' }}>
                {isCotizacion ? 'COTIZACIÓN' : 'FACTURA'}
              </div>
              <div style={{ color: isCotizacion ? '#d97706' : '#dc2626', fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>
                No. {invoiceNumber}
              </div>
              {!isCotizacion && (
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.6' }}>
                  <div><strong>CAI.</strong> {cai || '—'}</div>
                  <div><strong>RTN.</strong> {companyRtn}</div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DATE ROW ── */}
      <div
        style={{
          backgroundColor: '#1d4ed8',
          color: 'white',
          padding: '3px 8px',
          textAlign: 'right',
          fontSize: '10px',
          marginBottom: '4px',
          fontWeight: '500',
        }}
      >
        Tegucigalpa, M.D.C. {formatDateES(invoice.date)}
      </div>

      {/* ── CLIENT INFO ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #6b7280',
          marginBottom: '4px',
          fontSize: '10px',
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: '3px 6px', borderBottom: '1px solid #d1d5db' }}>
              <strong>Señor(es):</strong> {clientName}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '3px 6px' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td><strong>Dirección:</strong> {clientAddress}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <strong>RTN.</strong> {clientRtn}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── ITEMS TABLE ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #6b7280',
          marginBottom: '4px',
          fontSize: '10px',
        }}
      >
        <thead>
          <tr>
            <th className={thCell} style={{ width: '10%', padding: '4px 6px', border: '1px solid #6b7280' }}>
              Cantidad
            </th>
            <th className={thCell} style={{ width: '50%', padding: '4px 6px', border: '1px solid #6b7280' }}>
              DESCRIPCIÓN
            </th>
            <th className={thCell} style={{ width: '20%', padding: '4px 6px', border: '1px solid #6b7280', textAlign: 'right' }}>
              Precio Unitario
            </th>
            <th className={thCell} style={{ width: '20%', padding: '4px 6px', border: '1px solid #6b7280', textAlign: 'right' }}>
              Valor Total
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((item, idx) => {
            const qty    = parseFloat(item.qty       || 0)
            const price  = parseFloat(item.unitPrice || 0)
            const rowTotal = qty * price
            const hasData = item.qty !== '' && item.description !== ''
            return (
              <tr key={idx} style={{ height: '20px' }}>
                <td
                  style={{
                    border: '1px solid #d1d5db',
                    padding: '2px 6px',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                  }}
                >
                  {hasData ? qty : ''}
                </td>
                <td
                  style={{
                    border: '1px solid #d1d5db',
                    padding: '2px 6px',
                    verticalAlign: 'middle',
                  }}
                >
                  {item.description || ''}
                </td>
                <td
                  style={{
                    border: '1px solid #d1d5db',
                    padding: '2px 6px',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                  }}
                >
                  {hasData && price > 0 ? `L. ${fmt(price)}` : ''}
                </td>
                <td
                  style={{
                    border: '1px solid #d1d5db',
                    padding: '2px 6px',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                  }}
                >
                  {hasData && rowTotal > 0 ? `L. ${fmt(rowTotal)}` : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── BOTTOM SECTION: Exonerado + Totals ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '10px' }}>
        <tbody>
          <tr style={{ verticalAlign: 'top' }}>
            {/* LEFT: Datos del Adquirente Exonerado */}
            <td style={{ width: '55%', paddingRight: '8px' }}>
              <div
                style={{
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  padding: '3px 6px',
                  fontWeight: '600',
                  fontSize: '10px',
                  marginBottom: '2px',
                }}
              >
                Datos del Adquirente Exonerado
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #6b7280' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #6b7280', padding: '2px 4px', backgroundColor: '#f3f4f6', fontSize: '9px' }}>
                      No. O/C Exenta
                    </th>
                    <th style={{ border: '1px solid #6b7280', padding: '2px 4px', backgroundColor: '#f3f4f6', fontSize: '9px' }}>
                      No. Registro de Exonerado
                    </th>
                    <th style={{ border: '1px solid #6b7280', padding: '2px 4px', backgroundColor: '#f3f4f6', fontSize: '9px' }}>
                      No. Registro de la SAG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '22px' }}>
                    <td style={{ border: '1px solid #6b7280', padding: '2px 4px' }}>{noOcExenta}</td>
                    <td style={{ border: '1px solid #6b7280', padding: '2px 4px' }}>{noRegistroExonerado}</td>
                    <td style={{ border: '1px solid #6b7280', padding: '2px 4px' }}>{noRegistroSag}</td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* RIGHT: Totals */}
            <td style={{ width: '45%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Venta Exonerada', ventaExonerada],
                    ['Sub-Total Exento', subtotalExento],
                    ['Dsctos. y Rebajas', descuentos],
                    ['Sub-Total Gravado', subtotalGravado],
                    ['15% Impuesto Sobre Ventas', isv],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '2px 4px',
                          color: '#374151',
                          fontSize: '10px',
                        }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '2px 4px',
                          width: '80px',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '10px',
                        }}
                      >
                        L. {fmt(value)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '3px 4px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      TOTAL S./
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '3px 4px',
                        width: '80px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        borderTop: '2px solid #374151',
                        borderBottom: '2px solid #374151',
                      }}
                    >
                      L. {fmt(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FOOTER ── */}
      {!isCotizacion && (
        <div style={{ fontSize: '9px', color: '#374151', marginBottom: '4px' }}>
          <div><strong>Fecha Límite de Emisión:</strong> {emissionLimit}</div>
          <div><strong>Rango Autorizado del</strong> {rangeFrom} <strong>al</strong> {rangeTo}</div>
        </div>
      )}

      <hr style={{ border: '1px solid #374151', margin: '4px 0' }} />

      {/* Suma en letras */}
      <div style={{ marginBottom: '4px', fontSize: '10px' }}>
        <div style={{ marginBottom: '2px' }}>
          <strong>La Suma de:</strong>{' '}
          <span style={{ borderBottom: '1px solid #374151', display: 'inline-block', width: '70%' }}>&nbsp;</span>
        </div>
        <div
          style={{
            fontStyle: 'italic',
            fontWeight: '500',
            fontSize: '10px',
            textTransform: 'uppercase',
            color: '#1e3a8a',
            paddingLeft: '8px',
          }}
        >
          {sumaEnLetras}
        </div>
      </div>

      <hr style={{ border: '1px solid #374151', margin: '4px 0' }} />

      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '10px', fontSize: '10px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', paddingRight: '16px' }}>
              Recibí Conforme:{' '}
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid #374151',
                  width: '55%',
                }}
              >
                &nbsp;
              </span>
            </td>
            <td style={{ width: '50%', textAlign: 'right' }}>
              Firma Autorizada{' '}
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid #374151',
                  width: '55%',
                }}
              >
                &nbsp;
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
