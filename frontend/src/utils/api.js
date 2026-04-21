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

export const api = {
  // Auth
  login: (username, password) => post(`${BASE}/auth/login`, { username, password }),

  // Users
  getUsers:       ()           => get(`${BASE}/auth/users`),
  createUser:     (data)       => post(`${BASE}/auth/users`, data),
  deleteUser:     (id)         => del(`${BASE}/auth/users/${id}`),
  changePassword: (id, password) => put(`${BASE}/auth/users/${id}/password`, { password }),

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

  // Config
  getConfig:    ()     => get(`${BASE}/config`),
  updateConfig: (data) => put(`${BASE}/config`, data),
};
