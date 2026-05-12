import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { Component, useState } from 'react'
import { authStorage } from './utils/auth'

class ErrorBoundary extends Component {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'Error desconocido' }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-semibold mb-2">Ocurrió un error en esta sección</p>
          <p className="text-gray-500 text-sm mb-4">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import Dashboard from './pages/Dashboard'
import NewInvoice from './pages/NewInvoice'
import ViewInvoice from './pages/ViewInvoice'
import Settings from './pages/Settings'
import CotizacionesDashboard from './pages/CotizacionesDashboard'
import NewCotizacion from './pages/NewCotizacion'
import EditCotizacion from './pages/EditCotizacion'
import ViewCotizacion from './pages/ViewCotizacion'
import Login from './pages/Login'
import Users from './pages/Users'
import Clientes from './pages/Clientes'
import CatalogoServicios from './pages/CatalogoServicios'
import ServiciosCloud from './pages/ServiciosCloud'
import Reportes from './pages/Reportes'
import Finanzas   from './pages/Finanzas'
import CXC       from './pages/CXC'
import CXP       from './pages/CXP'
import Empleados from './pages/Empleados'
import GastosPage from './pages/GastosPage'
import CotizacionRespuesta from './pages/CotizacionRespuesta'

function PrivateRoute({ children }) {
  return authStorage.isLoggedIn() ? children : <Navigate to="/login" replace />
}

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const user = authStorage.getUser()

  const handleLogout = () => {
    authStorage.clear()
    navigate('/login', { replace: true })
  }

  const navItem = (to, label, icon, exact = false) => (
    <NavLink
      to={to}
      end={exact}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-700 text-white'
            : 'text-blue-100 hover:bg-blue-600 hover:text-white'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {label}
    </NavLink>
  )

  const sectionLabel = (text) => (
    <div className="px-4 pt-4 pb-1">
      <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">{text}</p>
    </div>
  )

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`no-print fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 min-h-screen bg-blue-800 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Brand */}
      <div className="px-6 py-5 border-b border-blue-700">
        <h1 className="text-white font-bold text-lg leading-tight">DEVS MRS</h1>
        <p className="text-blue-300 text-xs mt-1">Sistema de Facturación</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {sectionLabel('Facturas')}
        {navItem('/', 'Listado de Facturas', '📋', true)}
        {navItem('/nueva-factura', 'Nueva Factura', '➕')}

        {sectionLabel('Cotizaciones')}
        {navItem('/cotizaciones', 'Listado Cotizaciones', '📄', true)}
        {navItem('/nueva-cotizacion', 'Nueva Cotización', '➕')}

        {sectionLabel('Clientes')}
        {navItem('/clientes', 'Catálogo de Clientes', '👤')}

        {sectionLabel('Catálogo de Servicios')}
        {navItem('/catalogo-servicios', 'Servicios Tecnológicos', '🛠️')}
        {navItem('/servicios-cloud', 'Paquetes de Servicios', '☁️')}

        {sectionLabel('Finanzas')}
        {navItem('/finanzas', 'Resumen Financiero', '💰')}
        {navItem('/gastos', 'Gastos y Costos', '💸')}
        {navItem('/cxc', 'CXC · Por Cobrar', '📥')}
        {navItem('/cxp', 'CXP · Por Pagar', '📤')}

        {sectionLabel('RR.HH.')}
        {navItem('/empleados', 'Empleados', '👥')}

        {sectionLabel('Reportería')}
        {navItem('/reportes', 'Reportes de Ventas', '📊')}

        <div className="pt-3 border-t border-blue-700 mt-3">
          {navItem('/configuracion', 'Configuración', '⚙️')}
          {navItem('/usuarios', 'Usuarios', '👥')}
        </div>
      </nav>

      {/* User info + Logout */}
      <div className="px-4 py-4 border-t border-blue-700">
        <div className="flex items-center gap-3 mb-3">
          <div
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0,
            }}
          >
            👤
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p className="text-white text-xs font-semibold truncate">{user?.name || user?.username}</p>
            <p className="text-blue-300 text-xs truncate">{user?.username}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-200 hover:bg-blue-700 hover:text-white transition-colors"
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </aside>
    </>
  )
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="no-print sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 text-xl leading-none"
          >
            ☰
          </button>
          <span className="font-bold text-gray-800 text-sm">DEVS MRS</span>
        </div>
        <ErrorBoundary>
          <Routes>
            <Route path="/"                       element={<Dashboard />} />
            <Route path="/nueva-factura"          element={<NewInvoice />} />
            <Route path="/factura/:id"            element={<ViewInvoice />} />
            <Route path="/cotizaciones"           element={<CotizacionesDashboard />} />
            <Route path="/nueva-cotizacion"       element={<NewCotizacion />} />
            <Route path="/cotizacion/:id"         element={<ViewCotizacion />} />
            <Route path="/editar-cotizacion/:id"  element={<EditCotizacion />} />
            <Route path="/clientes"               element={<Clientes />} />
            <Route path="/catalogo-servicios"     element={<CatalogoServicios />} />
            <Route path="/servicios-cloud"        element={<ServiciosCloud />} />
            <Route path="/finanzas"               element={<Finanzas />} />
            <Route path="/gastos"                 element={<GastosPage />} />
            <Route path="/cxc"                   element={<CXC />} />
            <Route path="/cxp"                   element={<CXP />} />
            <Route path="/empleados"             element={<Empleados />} />
            <Route path="/reportes"               element={<Reportes />} />
            <Route path="/configuracion"          element={<Settings />} />
            <Route path="/usuarios"               element={<Users />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cotizacion-respuesta/:token" element={<CotizacionRespuesta />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
