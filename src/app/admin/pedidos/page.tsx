'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ReceiptLink from '@/components/ReceiptLink'
import { postAsSoffAdmin } from '@/lib/adminFetch'
import { Package, Search, ExternalLink, CheckCircle, Clock, FileImage, XCircle, AlertTriangle } from 'lucide-react'

export default function AdminPedidosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [bankReference, setBankReference] = useState('')
  const [verifiedAmount, setVerifiedAmount] = useState('')
  const [bankChecked, setBankChecked] = useState(false)
  const [confirmationNote, setConfirmationNote] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [statusFilter,setStatusFilter] = useState('todos')
  const [searchTerm,setSearchTerm] = useState('')


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
        router.replace('/')
        return
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

  const confirmTransfer = async (orderId: string) => {
    if (!bankChecked) { alert('Primero comprobá la acreditación en el extracto bancario.'); return }
    if (!window.confirm('¿Confirmás que el dinero está realmente acreditado en el banco? Esta operación se registrará con tu usuario.')) return
    setIsConfirming(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('La sesión venció. Volvé a ingresar.')
      const res = await fetch('/api/admin/orders/confirm-transfer', {
        method: 'POST',
        headers: {'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body: JSON.stringify({orderId,bankReference:bankReference.trim(),
          verifiedAmount:Number(verifiedAmount),bankStatementChecked:true,note:confirmationNote})
      })
      const body=await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo conciliar el pago.')
      setOrders(current=>current.map(o=>o.id===orderId?{...o,status:'pagado'}:o))
      setConfirmId(null);setBankReference('');setVerifiedAmount('');setBankChecked(false);setConfirmationNote('')
    } catch (e) {alert(e instanceof Error?e.message:'Error de conciliación')}
    finally {setIsConfirming(false)}
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (newStatus==='pagado') { alert('Los pagos de transferencia se confirman desde Conciliar transferencia.'); return }

    const order=orders.find(o=>o.id===orderId)
    if (!order) return
    if (newStatus==='cancelado' && order.status!=='pendiente') {
      alert('Los pedidos pagados requieren un circuito de reintegro. No pueden cancelarse desde esta pantalla.')
      return
    }
    if (newStatus==='cancelado' && !window.confirm('ATENCIÓN: revisá el extracto bancario antes de cancelar. ¿Confirmás que no ingresó el dinero?')) return
    try {
      await postAsSoffAdmin('/api/admin/orders/status',{orderId,newStatus,bankChecked:true,reason:newStatus==='cancelado'?'Cancelación manual tras revisión bancaria':'Cambio de estado administrativo'})
      setOrders(current=>current.map(o=>o.id===orderId?{...o,status:newStatus}:o))
    } catch(e){alert(e instanceof Error?e.message:'Error al cambiar estado')}
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

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input aria-label="Buscar pedido" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
            placeholder="Buscar por número de pedido o cliente" className="border rounded-lg p-2 flex-1" />
          <select aria-label="Filtrar pedidos" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded-lg p-2">
            {['todos','pendiente','pagado','en_preparacion','enviado','entregado','cancelado'].map(s=><option key={s} value={s}>{s==='todos'?'Todos':s.replace('_',' ')}</option>)}
          </select>
        </div>
        {orders.some(o=>o.status==='pendiente' && Date.now()-new Date(o.created_at).getTime()>72*3600000) &&
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 mb-4 text-sm">
            Hay reservas pendientes de hace más de 72 horas. Antes de cancelar, revisar el banco y el estado real del pedido. La liberación de stock es manual.
          </div>}
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
                  orders.filter(o=> (statusFilter==='todos'||o.status===statusFilter) &&
                    (o.id.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                     `${o.profiles?.first_name||''} ${o.profiles?.last_name||''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())))
                    .map(order => {
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
                                <ReceiptLink
                                  orderId={order.id}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full w-fit font-medium"
                                >
                                  <FileImage className="h-3.5 w-3.5" /> Ver comprobante
                                </ReceiptLink>
                                {order.transfer_reference && (
                                  <span className="text-[11px] font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit" title="N° de transferencia / operación">
                                    Op: #{order.transfer_reference}
                                  </span>
                                )}
                                {order.receipt_warning && (
                                  <div className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-300 p-1.5 rounded-lg max-w-[280px]">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-none" />
                                    <span className="leading-snug">{order.receipt_warning}</span>
                                  </div>
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
                              <option value="pendiente" disabled={order.status !== "pendiente"}>Pendiente</option>
                              <option value="pagado" disabled>Pagado (requiere conciliación)</option>
                              <option value="en_preparacion" disabled={order.status !== "pagado" && order.status !== "en_preparacion"}>En preparación</option>
                              <option value="enviado" disabled={order.status !== "en_preparacion" && order.status !== "enviado"}>Enviado</option>
                              <option value="entregado" disabled={order.status !== "enviado" && order.status !== "entregado"}>Entregado</option>
                              <option value="cancelado" disabled={order.status!=='pendiente' && order.status!=='cancelado'}>Cancelado</option>
                            </select>
                            {isTransfer && order.status === 'pendiente' && (
                              <button type="button" onClick={()=>{
                                  setConfirmId(confirmId===order.id?null:order.id)
                                  setBankReference('');setVerifiedAmount(String(order.total??''));setBankChecked(false);setConfirmationNote('')
                                }} className="mt-2 block ml-auto text-xs text-blue-700 underline">
                                Conciliar transferencia
                              </button>
                            )}
                          </td>
                        </tr>
                        {confirmId===order.id && isTransfer && order.status==='pendiente' && (
                          <tr className="bg-blue-50"><td colSpan={6} className="p-4">
                            <div className="flex flex-wrap gap-3 items-end">
                              <div className="w-full font-semibold text-sm text-blue-900">Conciliación bancaria manual — pedido #{order.id.slice(0,8)}</div>
                              <label className="text-xs">Referencia del movimiento bancario
                                <input value={bankReference} onChange={e=>setBankReference(e.target.value)} maxLength={100}
                                  className="block border rounded p-2 mt-1" placeholder="Número de operación del banco" />
                              </label>
                              <label className="text-xs">Importe acreditado (ARS)
                                <input type="number" min="0.01" step="0.01" value={verifiedAmount}
                                  onChange={e=>setVerifiedAmount(e.target.value)} className="block border rounded p-2 mt-1 w-40" />
                              </label>
                              <label className="text-xs">Observaciones (opcional)
                                <input value={confirmationNote} onChange={e=>setConfirmationNote(e.target.value)} maxLength={500}
                                  className="block border rounded p-2 mt-1" />
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium">
                                <input type="checkbox" checked={bankChecked} onChange={e=>setBankChecked(e.target.checked)} />
                                Revisé el banco y el dinero está acreditado
                              </label>
                              <button disabled={isConfirming || !bankChecked || bankReference.trim().length<6}
                                onClick={()=>confirmTransfer(order.id)} className="bg-blue-800 disabled:opacity-40 text-white text-sm rounded px-4 py-2">
                                {isConfirming?'Conciliando…':'Confirmar pago'}
                              </button>
                              <button type="button" onClick={()=>setConfirmId(null)} className="text-sm underline">Cancelar</button>
                            </div>
                            <p className="mt-2 text-xs text-blue-900">El comprobante subido por el cliente NO acredita el cobro. Verificar extracto bancario antes de confirmar.</p>
                          </td></tr>
                        )}
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
