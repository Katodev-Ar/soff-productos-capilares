'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase/client'
import { 
  Bell, 
  Tag, 
  Package, 
  Truck, 
  Info, 
  CheckCheck, 
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react'

type Notification = {
  id: string
  title: string
  message: string
  type: 'stock' | 'oferta' | 'pedido' | 'info'
  link?: string | null
  read: boolean
  created_at: string
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'def-1',
    title: '¡Descuento por Volumen Disponible!',
    message: 'Llevá 5% OFF en compras mayores a $45.000 y 10% OFF en compras mayores a $70.000 en todo el catálogo.',
    type: 'oferta',
    link: '/productos',
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'def-2',
    title: 'Envíos Rápidos en Tucumán',
    message: 'Calculá el costo de entrega exacto en tiempo real desde Av. Independencia 2820 mediante el mapa interactivo.',
    type: 'pedido',
    link: '/checkout',
    read: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'def-3',
    title: 'Alertas de Stock y Favoritos Activas',
    message: 'Guardá cualquier producto en favoritos para enterarte automáticamente cuando baje de precio o cuando se reponga el stock.',
    type: 'stock',
    link: '/favoritos',
    read: true,
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
]

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'stock' | 'oferta' | 'pedido'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (data && data.length > 0) {
            setNotifications(data as Notification[])
            setLoading(false)
            return
          }
        }
        // Fallback a notificaciones del sistema
        setNotifications(DEFAULT_NOTIFICATIONS)
      } catch (e) {
        setNotifications(DEFAULT_NOTIFICATIONS)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [])

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true
    return n.type === filter
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock': return <Package className="h-5 w-5 text-blue-600" />
      case 'oferta': return <Tag className="h-5 w-5 text-green-600" />
      case 'pedido': return <Truck className="h-5 w-5 text-amber-600" />
      default: return <Info className="h-5 w-5 text-indigo-600" />
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col text-gray-900 antialiased">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <Bell size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#002f5b]">
                Centro de Notificaciones
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Avisos importantes sobre tus pedidos, alertas de stock de tus favoritos y promociones especiales.
            </p>
          </div>

          {notifications.some(n => !n.read) && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002f5b] hover:text-black transition-colors"
            >
              <CheckCheck size={16} /> Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'all' 
                ? 'bg-black text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-black'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('oferta')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'oferta' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-600'
            }`}
          >
            Ofertas & Descuentos
          </button>
          <button
            onClick={() => setFilter('stock')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'stock' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-600'
            }`}
          >
            Stock & Reposición
          </button>
          <button
            onClick={() => setFilter('pedido')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'pedido' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-600'
            }`}
          >
            Envíos & Pedidos
          </button>
        </div>

        {/* Lista de Notificaciones */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <Bell size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">No hay notificaciones en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                  item.read ? 'border-gray-200/80 opacity-80' : 'border-blue-300 shadow-sm bg-gradient-to-r from-blue-50/20 to-white'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex-none mt-0.5">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">
                        {item.title}
                      </h3>
                      {!item.read && (
                        <span className="flex-none w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {item.message}
                    </p>

                    {item.link && (
                      <Link
                        href={item.link}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002f5b] hover:text-brand-primary transition-colors"
                      >
                        Ver detalles <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}
