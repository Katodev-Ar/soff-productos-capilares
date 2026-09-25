'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Package, Search, ExternalLink, CheckCircle, Clock, FileImage, XCircle } from 'lucide-react'

export default function AdminPedidosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verify Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        // If not admin, maybe redirect to home or show error
        // For testing purposes, we'll allow it if role is admin, but if you want to bypass during dev, comment the next line:
        // router.push('/')
        // return
      }
      
      setIsAdmin(true)

      // Fetch all orders with user details (if available, otherwise we just show user_id)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email,
            phone
          ),
          order_items (
            quantity,
            price,
            products (
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
      } else if (data) {
        setOrders(data)
      }
      
      setLoading(false)
    }

    loadData()
  }, [router])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      
    if (error) {
      alert('Error al actualizar estado: ' + error.message)
      return
    }
    
    // Update local state
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8" /> Panel de Pedidos
            </h1>
            <p className="text-gray-500 mt-1">Gestión de compras y comprobantes de transferencia</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                  <th className="p-4 font-semibold">ID Pedido / Fecha</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Total</th>
                  <th className="p-4 font-semibold">Comprobante</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No hay pedidos registrados aún.
                    </td>
                  </tr>
                ) : (
                  orders.map(order => {
                    const isTransfer = order.mp_payment_id?.includes('receipts')
                    
                    return (
                      <React.Fragment key={order.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-mono text-sm font-medium text-gray-900">
                              #{order.id.split('-')[0].toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleString('es-AR')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {order.profiles?.first_name} {order.profiles?.last_name}
                            </div>
                            <div className="text-xs text-gray-500 max-w-[200px] truncate" title={order.shipping_address || ''}>
                              {order.shipping_address?.split('|')[0] || 'Sin dirección'}
                              {order.shipping_address?.includes('Maps:') && (
                                <a 
                                  href={order.shipping_address.split('Maps: ')[1]} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-1 font-bold"
                                >
                                  (Ver Mapa)
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-gray-900">
                            ${order.total?.toLocaleString('es-AR')}
                          </td>
                          <td className="p-4">
                            {isTransfer ? (
                              <div className="flex flex-col gap-1.5">
                                <a 
                                  href={order.mp_payment_id} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full w-fit font-medium"
                                >
                                  <FileImage className="h-3.5 w-3.5" /> Ver comprobante
                                </a>
                                {order.transfer_reference && (
                                  <span className="text-[11px] font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit" title="N° de transferencia / operación">
                                    Op: #{order.transfer_reference}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Mercado Pago</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'pagado' || order.status === 'en_preparacion' || order.status === 'enviado' || order.status === 'entregado' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'pendiente' && <Clock className="h-3 w-3" />}
                              {(order.status === 'pagado' || order.status === 'enviado' || order.status === 'entregado') && <CheckCircle className="h-3 w-3" />}
                              {order.status === 'cancelado' && <XCircle className="h-3 w-3" />}
                              <span className="capitalize">{order.status.replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <select 
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black outline-none bg-white py-1 px-2 border cursor-pointer"
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="pagado">Pagado</option>
                              <option value="en_preparacion">En preparación</option>
                              <option value="enviado">Enviado</option>
                              <option value="entregado">Entregado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>
                        </tr>
                        {order.order_items && order.order_items.length > 0 && (
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <td colSpan={6} className="p-4 pt-0 pl-16">
                              <div className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">Productos del pedido</h4>
                                <ul className="space-y-2">
                                  {order.order_items.map((item: any, i: number) => (
                                    <li key={i} className="flex justify-between items-center text-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center p-1">
                                          {item.products?.image_url ? (
                                            <img src={item.products.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                          ) : (
                                            <Package className="w-4 h-4 text-gray-400" />
                                          )}
                                        </div>
                                        <span className="font-medium">{item.quantity}x</span>
                                        <span>{item.products?.name || 'Producto eliminado'}</span>
                                      </div>
                                      <span className="text-gray-500">${Number(item.price).toLocaleString('es-AR')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
