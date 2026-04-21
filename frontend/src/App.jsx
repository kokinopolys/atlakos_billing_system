import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { authStorage } from './utils/auth'
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

function PrivateRoute({ children }) {
  return authStorage.isLoggedIn() ? children : <Navigate to="/login" replace />
}

function Sidebar() {
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
    <aside className="no-print w-64 min-h-screen bg-blue-800 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-blue-700">
        <h1 className="text-white font-bold text-lg leading-tight">DEVS MRS</h1>
        <p className="text-blue-300 text-xs mt-1">Sistema de Facturación</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {sectionLabel('Facturas')}
        {navItem('/', 'Listado de Facturas', '📋', true)}
        {navItem('/nueva-factura', 'Nueva Factura', '➕')}

        {sectionLabel('Cotizaciones')}
        {navItem('/cotizaciones', 'Listado Cotizaciones', '📄', true)}
        {navItem('/nueva-cotizacion', 'Nueva Cotización', '➕')}

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
  )
}

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"                       element={<Dashboard />} />
          <Route path="/nueva-factura"          element={<NewInvoice />} />
          <Route path="/factura/:id"            element={<ViewInvoice />} />
          <Route path="/cotizaciones"           element={<CotizacionesDashboard />} />
          <Route path="/nueva-cotizacion"       element={<NewCotizacion />} />
          <Route path="/cotizacion/:id"         element={<ViewCotizacion />} />
          <Route path="/editar-cotizacion/:id"  element={<EditCotizacion />} />
          <Route path="/configuracion"          element={<Settings />} />
          <Route path="/usuarios"              element={<Users />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
