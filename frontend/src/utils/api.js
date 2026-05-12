import { authStorage } from './auth';

const BASE = '/api';

const getHeaders = () => {
  const token = authStorage.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const json = (r) => r.json();

const get   = (url)        => fetch(url, { headers: getHeaders() }).then(json);
const post  = (url, data)  => fetch(url, { method: 'POST',   headers: getHeaders(), body: JSON.stringify(data) }).then(json);
const put   = (url, data)  => fetch(url, { method: 'PUT',    headers: getHeaders(), body: JSON.stringify(data) }).then(json);
const patch = (url, data)  => fetch(url, { method: 'PATCH',  headers: getHeaders(), body: JSON.stringify(data) }).then(json);
const del   = (url)        => fetch(url, { method: 'DELETE', headers: getHeaders() }).then(json);

// Public fetch (no auth header)
const publicGet  = (url)        => fetch(url).then(json);
const publicPost = (url, data)  => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json);

export const api = {
  // Auth
  login: (username, password) => post(`${BASE}/auth/login`, { username, password }),

  // Users
  getUsers:       ()                   => get(`${BASE}/auth/users`),
  createUser:     (data)               => post(`${BASE}/auth/users`, data),
  deleteUser:     (id)                 => del(`${BASE}/auth/users/${id}`),
  changePassword: (id, password)       => put(`${BASE}/auth/users/${id}/password`, { password }),

  // Facturas
  getInvoices:   (params = {}) => get(`${BASE}/invoices?doc_type=factura&${new URLSearchParams(params)}`),
  getInvoice:    (id)          => get(`${BASE}/invoices/${id}`),
  createInvoice: (data)        => post(`${BASE}/invoices`, data),
  deleteInvoice: (id)          => del(`${BASE}/invoices/${id}`),

  // Cotizaciones
  getCotizaciones:        (params = {}) => get(`${BASE}/invoices?doc_type=cotizacion&${new URLSearchParams(params)}`),
  getCotizacion:          (id)          => get(`${BASE}/invoices/${id}`),
  createCotizacion:       (data)        => post(`${BASE}/invoices`, { ...data, docType: 'cotizacion' }),
  updateCotizacion:       (id, data)    => put(`${BASE}/invoices/${id}`, data),
  updateCotizacionStatus: (id, status)  => patch(`${BASE}/invoices/${id}/status`, { status }),
  convertToFactura:       (id)          => post(`${BASE}/invoices/${id}/convert`, {}),
  deleteCotizacion:       (id)          => del(`${BASE}/invoices/${id}`),
  enviarCotizacion:       (id, data)    => post(`${BASE}/invoices/${id}/enviar-cotizacion`, data),

  // Public cotizacion approval (no auth)
  getCotizacionPublica:  (token) => publicGet(`${BASE}/cotizacion-respuesta/${token}`),
  responderCotizacion:   (token, data) => publicPost(`${BASE}/cotizacion-respuesta/${token}`, data),

  // Config
  getConfig:    ()     => get(`${BASE}/config`),
  updateConfig: (data) => put(`${BASE}/config`, data),

  // Clientes
  getClientes:      (params = {}) => get(`${BASE}/clientes?${new URLSearchParams(params)}`),
  getCliente:       (id)          => get(`${BASE}/clientes/${id}`),
  createCliente:    (data)        => post(`${BASE}/clientes`, data),
  updateCliente:    (id, data)    => put(`${BASE}/clientes/${id}`, data),
  deleteCliente:    (id)          => del(`${BASE}/clientes/${id}`),
  getClienteReport: ()            => get(`${BASE}/clientes/report`),
  getClienteDocumentos: (id)      => get(`${BASE}/clientes/${id}/documentos`),

  // Servicios (catálogo de servicios tecnológicos)
  getServicios:    (params = {}) => get(`${BASE}/servicios?${new URLSearchParams(params)}`),
  getServicio:     (id)          => get(`${BASE}/servicios/${id}`),
  getServicioCategorias: ()      => get(`${BASE}/servicios/categorias`),
  createServicio:  (data)        => post(`${BASE}/servicios`, data),
  updateServicio:  (id, data)    => put(`${BASE}/servicios/${id}`, data),
  deleteServicio:  (id)          => del(`${BASE}/servicios/${id}`),

  // Gastos
  getGastos:          (params = {}) => get(`${BASE}/gastos?${new URLSearchParams(params)}`),
  getGastoCategorias: ()            => get(`${BASE}/gastos/categorias`),
  createGasto:        (data)        => post(`${BASE}/gastos`, data),
  updateGasto:        (id, data)    => put(`${BASE}/gastos/${id}`, data),
  deleteGasto:        (id)          => del(`${BASE}/gastos/${id}`),

  // Reportes
  getReporteResumen:     (params = {}) => get(`${BASE}/reportes/resumen?${new URLSearchParams(params)}`),
  getReportePorFecha:    (params = {}) => get(`${BASE}/reportes/por-fecha?${new URLSearchParams(params)}`),
  getReportePorCliente:  (params = {}) => get(`${BASE}/reportes/por-cliente?${new URLSearchParams(params)}`),
  getReportePorServicio: (params = {}) => get(`${BASE}/reportes/por-servicio?${new URLSearchParams(params)}`),

  // CXC (Cuentas por Cobrar)
  getCXC:        (params = {}) => get(`${BASE}/cxc?${new URLSearchParams(params)}`),
  getCXCResumen: ()            => get(`${BASE}/cxc/resumen`),
  createCXC:     (data)        => post(`${BASE}/cxc`, data),
  updateCXC:     (id, data)    => put(`${BASE}/cxc/${id}`, data),
  payCXC:        (id, data)    => patch(`${BASE}/cxc/${id}/pay`, data),
  deleteCXC:     (id)          => del(`${BASE}/cxc/${id}`),

  // CXP (Cuentas por Pagar)
  getCXP:        (params = {}) => get(`${BASE}/cxp?${new URLSearchParams(params)}`),
  getCXPResumen: ()            => get(`${BASE}/cxp/resumen`),
  createCXP:     (data)        => post(`${BASE}/cxp`, data),
  updateCXP:     (id, data)    => put(`${BASE}/cxp/${id}`, data),
  payCXP:        (id, data)    => patch(`${BASE}/cxp/${id}/pay`, data),
  deleteCXP:     (id)          => del(`${BASE}/cxp/${id}`),

  // Empleados
  getEmpleados:    ()          => get(`${BASE}/empleados`),
  createEmpleado:  (data)      => post(`${BASE}/empleados`, data),
  updateEmpleado:  (id, data)  => put(`${BASE}/empleados/${id}`, data),
  deleteEmpleado:  (id)        => del(`${BASE}/empleados/${id}`),
  getVouchers:     (empId)     => get(`${BASE}/empleados/${empId}/vouchers`),
  createVoucher:   (empId, d)  => post(`${BASE}/empleados/${empId}/vouchers`, d),
  sendVoucher:     (id)        => post(`${BASE}/empleados/vouchers/${id}/send-email`, {}),
  testEmail:       (to, emailConfig) => post(`${BASE}/empleados/test-email`, { to, emailConfig }),

  // Finanzas
  getResumenFinanciero: (params = {}) => get(`${BASE}/finanzas/resumen?${new URLSearchParams(params)}`),

  // Outlook OAuth2
  initOutlookAuth:       (clientId) => post(`${BASE}/email/outlook/init`, { clientId }),
  pollOutlookAuth:       ()         => post(`${BASE}/email/outlook/poll`, {}),
  getOutlookStatus:      ()         => get(`${BASE}/email/outlook/status`),
  disconnectOutlook:     ()         => del(`${BASE}/email/outlook/disconnect`),
};
