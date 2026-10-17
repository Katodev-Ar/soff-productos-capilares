'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Search, ChevronDown, Check, X, Shield, ShoppingBag, Store, Scissors } from 'lucide-react'
import Link from 'next/link'

const ROLES = [
  { value: 'minorista', label: 'Minorista', color: 'bg-blue-100 text-blue-800', icon: ShoppingBag },
  { value: 'mayorista', label: 'Mayorista', color: 'bg-green-100 text-green-800', icon: Store },
  { value: 'revendedor', label: 'Revendedor', color: 'bg-purple-100 text-purple-800', icon: Store },
  { value: 'peluquero', label: 'Peluquero', color: 'bg-orange-100 text-orange-800', icon: Scissors },
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800', icon: Shield },
]

function getRoleBadge(role: string) {
  return ROLES.find(r => r.value === role) || ROLES[0]
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentAdminId(user.id)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(true)
    setFeedback(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setFeedback({ type: 'error', message: 'Sesión expirada. Recargá la página.' })
        return
      }

      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, newRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Error al cambiar el rol' })
      } else {
        setFeedback({ type: 'success', message: data.message })
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Error de conexión' })
    } finally {
      setChangingRole(false)
      setEditingUserId(null)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  const filtered = users.filter(u =>
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.dni?.includes(search)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" /> Usuarios
          </h1>
          <p className="text-gray-500 mt-1">Gestión de clientes y roles — {users.length} usuarios registrados</p>
        </div>
        <Link href="/admin/comercial" className="bg-black text-white rounded-lg px-4 py-2 text-sm">Aprobar cuentas y administrar precios →</Link>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o DNI..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-black focus:border-black outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Contacto</th>
                <th className="p-4 font-semibold">DNI</th>
                <th className="p-4 font-semibold">Rol</th>
                <th className="p-4 font-semibold">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => {
                const badge = getRoleBadge(user.role)
                const isEditing = editingUserId === user.id
                const isSelf = user.id === currentAdminId

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {user.phone || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {user.dni || '-'}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          {ROLES.map(r => (
                            <button
                              key={r.value}
                              disabled={changingRole || r.value === user.role}
                              onClick={() => handleRoleChange(user.id, r.value)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                r.value === user.role
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                              }`}
                            >
                              <r.icon className="h-3.5 w-3.5" />
                              {r.label}
                              {r.value === user.role && <span className="text-[10px] text-gray-400">(actual)</span>}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isSelf && setEditingUserId(user.id)}
                          disabled={isSelf}
                          title={isSelf ? 'No podés cambiar tu propio rol' : 'Click para cambiar rol'}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${badge.color} ${
                            isSelf ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-80'
                          }`}
                        >
                          {user.role || 'minorista'}
                          {!isSelf && <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
