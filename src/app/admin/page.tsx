'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Package, ShoppingBag, Users, DollarSign, ArrowRight, Truck, Save, CheckCircle2 } from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalProducts: 0, totalUsers: 0, totalRevenue: 0 })
  const [freeShippingAmount, setFreeShippingAmount] = useState(75000)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Fetch counts and settings
      const [ordersRes, pendingRes, productsRes, usersRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('id, total', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pendiente'),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('store_settings').select('value').eq('key', 'free_shipping_threshold').single()
      ])

      const revenue = ordersRes.data?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0

      if (settingsRes.data?.value) {
        const val = parseInt(settingsRes.data.value, 10)
        if (!isNaN(val)) setFreeShippingAmount(val)
      }

      setStats({
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalRevenue: revenue,
      })
      setLoading(false)
    }
    loadStats()
  }, [router])

  const handleSaveFreeShipping = async () => {
    setSavingThreshold(true)
    try {
      await supabase
        .from('store_settings')
        .upsert({
          key: 'free_shipping_threshold',
          value: String(freeShippingAmount),
          updated_at: new Date().toISOString()
        })
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 3000)
    } catch (e) {
      console.error('Error al guardar monto:', e)
    } finally {
      setSavingThreshold(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  const cards = [
    { label: 'Pedidos Totales', value: stats.totalOrders, icon: Package, color: 'bg-blue-500', href: '/admin/pedidos' },
    { label: 'Pedidos Pendientes', value: stats.pendingOrders, icon: Package, color: 'bg-yellow-500', href: '/admin/pedidos' },
    { label: 'Productos', value: stats.totalProducts, icon: ShoppingBag, color: 'bg-purple-500', href: '/admin/productos' },
    { label: 'Usuarios', value: stats.totalUsers, icon: Users, color: 'bg-green-500', href: '#' },
  ]

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-500 mb-8">Bienvenido al panel de control de Soff Productos</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cards.map(card => (
            <Link key={card.label} href={card.href} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-xl text-white`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Link>
          ))}
        </div>

        {/* Revenue Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-black p-3 rounded-xl text-white">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>

        {/* Free Shipping Configuration Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-[#002f5b] p-3.5 rounded-xl text-white flex-none">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Monto Mínimo para Entrega Gratis</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Establece a partir de qué monto total de compra el cliente tiene envío gratis bonificado automáticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-900 w-36 outline-none focus:border-black text-sm"
                  value={freeShippingAmount}
                  onChange={e => setFreeShippingAmount(Number(e.target.value))}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveFreeShipping}
                disabled={savingThreshold}
                className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {savingThreshold ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {savedNotice && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={16} className="text-green-600 flex-none" />
              <span>¡Monto de entrega gratis actualizado con éxito a ${freeShippingAmount.toLocaleString('es-AR')}!</span>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/pedidos" className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-black transition-colors">
            <Package className="h-8 w-8 text-gray-700" />
            <div>
              <p className="font-semibold text-gray-900">Gestionar Pedidos</p>
              <p className="text-sm text-gray-500">Ver pedidos, comprobantes y cambiar estados</p>
            </div>
          </Link>
          <Link href="/admin/productos" className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-black transition-colors">
            <ShoppingBag className="h-8 w-8 text-gray-700" />
            <div>
              <p className="font-semibold text-gray-900">Gestionar Productos</p>
              <p className="text-sm text-gray-500">Stock, precios y catálogo</p>
            </div>
          </Link>
          <Link href="/admin/stock" className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-black transition-colors">
            <Package className="h-8 w-8 text-gray-700" />
            <div>
              <p className="font-semibold text-gray-900">Importar Stock</p>
              <p className="text-sm text-gray-500">Actualizar masivamente (CSV)</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
