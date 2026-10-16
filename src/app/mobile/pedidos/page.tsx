'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ReceiptLink from '@/components/ReceiptLink'
import { postAsSoffAdmin } from '@/lib/adminFetch'
import { ShoppingBag, CheckCircle, Clock, XCircle, RefreshCw, FileImage, ChevronDown, AlertTriangle } from 'lucide-react'

type OrderStatus = 'all' | 'pendiente' | 'entregado' | 'cancelado'

export default function MobilePedidosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState<OrderStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/mobile'); return }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
    setRefreshing(false)
  }, [router])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders()
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await postAsSoffAdmin('/api/admin/orders/status',{orderId,newStatus,bankChecked:true,
        reason:newStatus==='cancelado'?'Cancelación desde panel móvil tras revisar el banco':'Cambio desde panel móvil'})
      setOrders(current=>current.map(o=>o.id===orderId?{...o,status:newStatus}:o))
    } catch(e){alert(e instanceof Error?e.message:'Error al actualizar')}
  }

  const statusConfig: Record<string, { label: string, color: string, bgColor: string, icon: typeof Clock }> = {
    pendiente: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
    pagado: { label: 'Pagado', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle },
    en_preparacion: { label: 'En preparación', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
    enviado: { label: 'Enviado', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle },
    entregado: { label: 'Entregado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
    cancelado: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = {
    all: orders.length,
    pendiente: orders.filter(o => o.status === 'pendiente').length,
    entregado: orders.filter(o => o.status === 'entregado').length,
    cancelado: orders.filter(o => o.status === 'cancelado').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 pt-6 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" /> Pedidos
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{orders.length} pedidos en total</p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2.5 bg-gray-100 rounded-xl text-gray-600 active:bg-gray-200 ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(
            [
              { key: 'all' as const, label: 'Todos' },
              { key: 'pendiente' as const, label: '🟡 Pendientes' },
              { key: 'entregado' as const, label: '🟢 Completados' },
              { key: 'cancelado' as const, label: '🔴 Cancelados' },
            ] as const
          ).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No hay pedidos {filter !== 'all' ? 'con este estado' : ''}
          </div>
        ) : (
          filtered.map(order => {
            const config = statusConfig[order.status] || statusConfig.pendiente
            const StatusIcon = config.icon
            const isExpanded = expandedId === order.id
            const isTransfer = order.mp_payment_id?.includes('receipts')

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Order Summary (always visible) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 text-left active:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-medium text-gray-500">
                          #{order.id.split('-')[0].toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {order.profiles?.first_name || 'Cliente'} {order.profiles?.last_name || ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ${order.total?.toLocaleString('es-AR')}
                      </span>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {/* Client Info */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Datos del cliente</p>
                      {order.profiles?.email && (
                        <p className="text-sm text-gray-700">📧 {order.profiles.email}</p>
                      )}
                      {order.profiles?.phone && (
                        <p className="text-sm text-gray-700">📱 {order.profiles.phone}</p>
                      )}
                      {order.shipping_address && (
                        <p className="text-sm text-gray-700 mt-1">📍 {order.shipping_address}</p>
                      )}
                    </div>

                    {/* Transfer Receipt */}
                    {isTransfer && (
                      <div className="space-y-2">
                        <ReceiptLink
                          orderId={order.id}
                          className="flex items-center gap-2 bg-blue-50 text-blue-600 rounded-xl p-3 text-sm font-medium active:bg-blue-100"
                        >
                          <FileImage className="h-5 w-5" />
                          Ver comprobante de transferencia
                        </ReceiptLink>
                        {order.receipt_warning && (
                          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-none" />
                            <div>
                              <p className="font-bold text-amber-950">⚠️ COMPROBANTE EN DUDA</p>
                              <p className="mt-0.5 font-normal leading-relaxed">{order.receipt_warning}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Change Status: respetar las transiciones válidas */}
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-2">Cambiar estado</p>
                      <div className="flex gap-2">
                        {order.status === 'pendiente' && (
                          <p className="text-xs text-amber-700">Conciliá el pago desde Administración → Pedidos. El comprobante no acredita fondos.</p>
                        )}
                        {order.status === 'pagado' && (
                          <button onClick={() => updateOrderStatus(order.id, 'en_preparacion')} className="flex-1 bg-blue-100 text-blue-700 font-medium rounded-xl py-2.5 text-xs">En preparación</button>
                        )}
                        {order.status === 'en_preparacion' && (
                          <button onClick={() => updateOrderStatus(order.id, 'enviado')} className="flex-1 bg-blue-100 text-blue-700 font-medium rounded-xl py-2.5 text-xs">Marcar enviado</button>
                        )}
                        {order.status === 'enviado' && (
                          <button onClick={() => updateOrderStatus(order.id, 'entregado')} className="flex-1 bg-green-100 text-green-700 font-medium rounded-xl py-2.5 text-xs">Entregado</button>
                        )}
                        {order.status === 'pendiente' && (
                          <button
                            onClick={() => { if (window.confirm('¿Verificaste el banco y confirmás que NO se acreditó el pago? Se liberará el stock.')) updateOrderStatus(order.id, 'cancelado') }}
                            className="flex-1 bg-red-100 text-red-700 font-medium rounded-xl py-2.5 text-xs flex items-center justify-center gap-1"
                          ><XCircle className="h-3.5 w-3.5" /> Cancelar</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
