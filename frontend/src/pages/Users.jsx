import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { authStorage } from '../utils/auth'

export default function Users() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ username: '', password: '', name: '' })
  const [formError, setFormError] = useState('')
  const [formOk, setFormOk]     = useState('')
  const [saving, setSaving]     = useState(false)

  const currentUser = authStorage.getUser()

  const load = () => {
    setLoading(true)
    api.getUsers()
      .then(data => {
        if (Array.isArray(data)) setUsers(data)
        else setError('Error al cargar usuarios')
      })
      .catch(() => setError('No se pudo conectar'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormOk('')
    if (!form.username || !form.password) {
      return setFormError('Usuario y contraseña son requeridos')
    }
    setSaving(true)
    try {
      const res = await api.createUser(form)
      if (res.error) {
        setFormError(res.error)
      } else {
        setFormOk('Usuario creado correctamente')
        setForm({ username: '', password: '', name: '' })
        setCreating(false)
        load()
      }
    } catch {
      setFormError('Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar el usuario "${user.username}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await api.deleteUser(user.id)
      if (res.error) alert(res.error)
      else load()
    } catch {
      alert('Error al eliminar usuario')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de acceso al sistema</p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(''); setFormOk('') }}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Crear nuevo usuario</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario *</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ej. juan.perez"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contraseña"
              />
            </div>

            {formError && (
              <div className="col-span-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                ⚠️ {formError}
              </div>
            )}

            <div className="col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Crear Usuario'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {formOk && !creating && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm mb-4">
          ✅ {formOk}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Usuarios del sistema</h2>
        </div>

        {loading && (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        )}
        {!loading && error && (
          <div className="p-10 text-center text-red-500">{error}</div>
        )}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Usuario</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Nombre</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200">Creado</th>
                <th className="px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-mono text-gray-800 border-b border-gray-100">
                    {u.username}
                    {currentUser?.username === u.username && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Tú</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 border-b border-gray-100">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500 border-b border-gray-100 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-HN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-100">
                    {currentUser?.username !== u.username && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
