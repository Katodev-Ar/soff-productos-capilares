'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Package, ShoppingBag, DollarSign, Clock, TrendingUp, AlertTriangle, LogOut } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  lowStockProducts: number
  totalRevenue: number
}

export default function MobileDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalRevenue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/mobile'); return }

      const [ordersRes, pendingRes, productsRes, lowStockRes] = await Promise.all([
        supabase.from('orders').select('id, total', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).lt('stock', 10),
      ])

      const revenue = ordersRes.data?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0

      // Recent orders
      const { data: recent } = await supabase
        .from('orders')
        .select(`*, profiles:user_id (first_name, last_name)`)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        totalProducts: productsRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        totalRevenue: revenue,
      })
      setRecentOrders(recent || [])
      setLoading(false)
    }
    loadDashboard()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/mobile')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    )
  }

  const statusLabel = (s: string) => s === 'pending' ? 'Pendiente' : s === 'completed' ? 'Completado' : 'Cancelado'
  const statusColor = (s: string) => s === 'pending' ? 'bg-yellow-100 text-yellow-700' : s === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-black text-white px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">Bienvenido a</p>
            <h1 className="text-xl font-bold">Soff Admin 📱</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-gray-800 rounded-xl text-gray-400 active:bg-gray-700"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 shadow-lg shadow-pink-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-pink-200" />
            <span className="text-pink-100 text-sm font-medium">Ingresos Totales</span>
          </div>
          <p className="text-3xl font-bold text-white">
            ${stats.totalRevenue.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/mobile/pedidos" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50">
            <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pedidos Totales</p>
          </Link>

          <Link href="/mobile/pedidos" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50">
            <div className="bg-yellow-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
          </Link>

          <Link href="/mobile/stock" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50">
            <div className="bg-purple-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500 mt-0.5">Productos</p>
          </Link>

          <Link href="/mobile/stock" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50">
            <div className="bg-red-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockProducts}</p>
            <p className="text-xs text-gray-500 mt-0.5">Stock Bajo</p>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Últimos Pedidos</h2>
            <Link href="/mobile/pedidos" className="text-pink-500 text-sm font-medium">
              Ver todos →
            </Link>
          </div>

          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
                No hay pedidos aún
              </div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {order.profiles?.first_name || 'Cliente'} {order.profiles?.last_name || ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${order.total?.toLocaleString('es-AR')}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
