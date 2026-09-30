'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { 
  Eye, 
  PackageSearch, 
  CreditCard, 
  Truck, 
  ArrowLeft, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  X, 
  MessageCircle, 
  FileText,
  Store,
  Bike
} from 'lucide-react'
import { formatPrice } from '@/lib/catalog'

const WHATSAPP_PHONE = '5493816253929'

export default function PedidosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')

      const [profileRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('orders')
          .select(`
            *,
            order_items (
              id,
              quantity,
              price,
              products (
                id,
                name,
                image_url
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (ordersRes.data) setOrders(ordersRes.data)
      
      setLoading(false)
    }
    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  const primaryAddress = profile?.addresses?.[0] || (profile?.address ? {
    address: profile.address,
    city: profile.city || 'San Miguel de Tucumán',
    cp: profile.postal_code || '4000',
    map_url: null
  } : null)

  const getOrderStatusInfo = (order: any) => {
    const status = (order.status || 'pendiente').toLowerCase()
    const isTransfer = order.mp_payment_id?.includes('receipts')

    if (status === 'cancelado' || status === 'cancelled') {
      return {
        step: 0,
        label: 'Cancelado',
        badgeColor: 'bg-red-100 text-red-700 border-red-200',
        description: 'El pedido fue cancelado',
        paymentLabel: 'Cancelado',
        paymentColor: 'text-red-600'
      }
    }

    if (status === 'entregado' || status === 'completed' || status === 'completado') {
      return {
        step: 4,
        label: 'Entregado',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        description: '¡Tu pedido fue entregado con éxito!',
        paymentLabel: 'Completado',
        paymentColor: 'text-emerald-600'
      }
    }

    if (status === 'enviado') {
      return {
        step: 3,
        label: 'Enviando el pedido',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Tu pedido está en camino a tu domicilio',
        paymentLabel: 'Pagado',
        paymentColor: 'text-emerald-600'
      }
    }

    if (status === 'en_preparacion' || status === 'pagado') {
      return {
        step: 2,
        label: 'En preparación',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Sofia está preparando tu paquete',
        paymentLabel: 'Confirmado',
        paymentColor: 'text-blue-600'
      }
    }

    // Default: pendiente / en revision
    return {
      step: 1,
      label: isTransfer ? 'En revisión' : 'Pendiente de pago',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: isTransfer 
        ? 'Comprobante recibido. En revisión manual antes del despacho' 
        : 'Esperando acreditación del pago',
      paymentLabel: isTransfer ? 'En revisión' : 'Pendiente',
      paymentColor: 'text-amber-600'
    }
  }

  const stepsList = [
    { num: 1, title: 'En revisión' },
    { num: 2, title: 'En preparación' },
    { num: 3, title: 'Enviando el pedido' },
    { num: 4, title: 'Entregado' }
  ]

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TOP BAR / NAVIGATION */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a la tienda
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-bold text-gray-900">Mis Pedidos</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link 
              href="/checkout"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-black bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300"
            >
              <ShoppingBag className="w-4 h-4" /> Ver Carrito
            </Link>
            <Link 
              href="/cuenta"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-black bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300"
            >
              Mi Perfil
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: DATOS */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Datos</h2>
            
            {/* Datos Personales */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Datos Personales</h3>
                <Link href="/cuenta" className="text-sm font-semibold text-gray-900 hover:underline">
                  Editar
                </Link>
              </div>
              <div className="text-sm text-gray-600 space-y-1.5">
                <p className="font-semibold text-gray-900 uppercase">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-gray-500 truncate">{email}</p>
                <p className="text-gray-500">DNI / CUIT: {profile?.dni || '-'}</p>
                <p className="text-gray-500">Teléfono: {profile?.phone || '-'}</p>
              </div>
            </div>

            {/* Mis Direcciones */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" /> Mis direcciones
                </h3>
                <Link href="/cuenta" className="text-sm font-semibold text-gray-900 hover:underline">
                  Editar
                </Link>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                {primaryAddress ? (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">{primaryAddress.address}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{primaryAddress.city} {primaryAddress.cp && `• CP ${primaryAddress.cp}`}</p>
                    {primaryAddress.map_url && (
                      <a 
                        href={primaryAddress.map_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold mt-2"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Ver en Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-xs">No hay direcciones registradas aún. Se guardará automáticamente con tu primer pedido.</p>
                )}
              </div>
            </div>

            {/* Soporte WhatsApp */}
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 text-emerald-950">
              <div className="flex items-center gap-2.5 mb-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm">¿Tenés alguna consulta?</h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed mb-3">
                Sofia te atiende de forma directa para coordinar envíos, horarios o resolver cualquier duda sobre tu pedido.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('¡Hola Sofia! Tengo una consulta sobre mis compras en la tienda.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Hablar con Sofia por WhatsApp
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: COMPRAS */}
          <div className="lg:col-span-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Mis Compras</h2>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PackageSearch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aún no tenés compras</h3>
                <p className="text-gray-500 mb-6 text-sm">Cuando realices una compra, podrás hacer el seguimiento en tiempo real desde acá.</p>
                <Link href="/productos" className="inline-block bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
                  Ir a la tienda
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const statusInfo = getOrderStatusInfo(order)
                  const isTransfer = order.mp_payment_id?.includes('receipts')
                  const orderItems = order.order_items || []
                  const mapsUrlMatch = order.shipping_address?.match(/https:\/\/www\.google\.com\/maps\?q=[^|\s]+/)
                  const mapsUrl = mapsUrlMatch ? mapsUrlMatch[0] : null
                  const cleanAddress = order.shipping_address ? order.shipping_address.split('|')[0].trim() : 'Retiro en el local'

                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                      {/* Card Header */}
                      <div className="bg-[#f0f0f0] px-6 py-3.5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm sm:text-base">
                            Orden: #{order.id.slice(0, 4).toUpperCase()}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.badgeColor}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 font-medium">
                          <span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                            title="Ver detalle del pedido"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6">
                        {/* LÍNEA DE TIEMPO / TIMELINE DE SEGUIMIENTO */}
                        {statusInfo.step > 0 && (
                          <div className="mb-6 pb-6 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Seguimiento del pedido</p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {stepsList.map(step => {
                                const isPassed = statusInfo.step >= step.num
                                const isCurrent = statusInfo.step === step.num
                                return (
                                  <div key={step.num} className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      isCurrent 
                                        ? 'bg-black text-white ring-4 ring-gray-100 shadow-sm' 
                                        : isPassed 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      {isPassed && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                                    </div>
                                    <span className={`text-[11px] mt-1.5 leading-tight ${
                                      isCurrent ? 'font-bold text-gray-900' : isPassed ? 'font-medium text-gray-700' : 'text-gray-400'
                                    }`}>
                                      {step.title}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-3 italic">{statusInfo.description}</p>
                          </div>
                        )}

                        {/* NOTA DE SOFIA / OBSERVACIÓN SI EXISTE */}
                        {order.receipt_warning && (
                          <div className="mb-5 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-none" />
                            <div>
                              <p className="font-bold text-amber-950">Observación sobre tu comprobante:</p>
                              <p className="mt-0.5 leading-relaxed">{order.receipt_warning}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                          <div className="space-y-2 text-sm flex-1">
                            {/* Pago */}
                            <div className="flex items-center gap-2 font-medium">
                              <CreditCard className="w-4 h-4 text-gray-400 flex-none" />
                              <span className="text-gray-500">Pago:</span>
                              <span className={`font-semibold ${statusInfo.paymentColor}`}>
                                {statusInfo.paymentLabel}
                              </span>
                              {order.transfer_reference && (
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  Op #{order.transfer_reference}
                                </span>
                              )}
                            </div>

                            {/* Envío */}
                            <div className="flex items-start gap-2 font-medium">
                              <Truck className="w-4 h-4 text-gray-400 mt-0.5 flex-none" />
                              <div>
                                <span className="text-gray-500">Entrega: </span>
                                <span className="text-gray-900 font-semibold">{cleanAddress}</span>
                                {mapsUrl && (
                                  <a 
                                    href={mapsUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold ml-2 underline"
                                  >
                                    Ver en Mapa
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Total y botón Ver Detalle */}
                            <div className="pt-3">
                              <p className="text-2xl font-black text-gray-900 tracking-tight">
                                ${order.total?.toLocaleString('es-AR')}
                              </p>
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="text-xs font-bold text-gray-900 hover:underline mt-1.5 flex items-center gap-1"
                              >
                                Ver detalle de productos y comprobante {'>'}
                              </button>
                            </div>
                          </div>

                          {/* Miniatura de productos comprados */}
                          <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto pb-1">
                            {orderItems.length > 0 ? (
                              orderItems.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-xl p-1 flex items-center justify-center shrink-0 relative group" title={item.products?.name}>
                                  {item.products?.image_url ? (
                                    <img 
                                      src={item.products.image_url} 
                                      alt={item.products?.name || 'Producto'} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <PackageSearch className="w-6 h-6 text-gray-300" />
                                  )}
                                  <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                    {item.quantity}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center justify-center p-2 text-center shrink-0">
                                <PackageSearch className="w-6 h-6 text-gray-300 mb-1" />
                                <span className="text-[10px] text-gray-400 font-medium leading-tight">Productos</span>
                              </div>
                            )}
                            {orderItems.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-600">
                                +{orderItems.length - 3}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón si es transferencia para ver comprobante o contactar */}
                        {isTransfer && order.mp_payment_id && (
                          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <a 
                              href={order.mp_payment_id} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg"
                            >
                              <FileText className="w-3.5 h-3.5" /> Ver comprobante adjunto
                            </a>
                            <a
                              href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(`¡Hola Sofia! Te consulto por mi orden #${order.id.slice(0, 4).toUpperCase()} de $${order.total?.toLocaleString('es-AR')}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-semibold"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Consultar a Sofia por WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL DETALLE DE PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Orden #{selectedOrder.id.slice(0, 6).toUpperCase()}
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getOrderStatusInfo(selectedOrder).badgeColor}`}>
                    {getOrderStatusInfo(selectedOrder).label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Realizada el {new Date(selectedOrder.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Observación / Aviso del vendedor */}
              {selectedOrder.receipt_warning && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-none" />
                  <div>
                    <p className="font-bold text-sm">Nota del vendedor (Sofia):</p>
                    <p className="mt-1 leading-relaxed">{selectedOrder.receipt_warning}</p>
                  </div>
                </div>
              )}

              {/* Lista de Productos */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Productos del pedido</h4>
                <div className="space-y-2.5">
                  {(selectedOrder.order_items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 p-1 flex items-center justify-center shrink-0">
                          {item.products?.image_url ? (
                            <img src={item.products.image_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <PackageSearch className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1">{item.products?.name || 'Producto'}</p>
                          <p className="text-[11px] text-gray-500">Cantidad: {item.quantity} × ${Number(item.price).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        ${(item.quantity * item.price).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de Envío y Dirección */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Método y dirección de entrega</h4>
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {selectedOrder.shipping_address || 'Retiro en el local'}
                </p>
                {selectedOrder.shipping_address?.includes('https://www.google.com/maps') && (
                  <a
                    href={selectedOrder.shipping_address.split('Maps: ')[1]?.split('|')[0] || selectedOrder.shipping_address.match(/https:\/\/[^\s]+/)?.[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold mt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Abrir ubicación en Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Comprobante de Transferencia */}
              {selectedOrder.mp_payment_id?.includes('receipts') && (
                <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-700" /> Comprobante de pago adjunto
                    </h4>
                    {selectedOrder.transfer_reference && (
                      <span className="text-xs font-mono font-bold bg-white text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                        Op #{selectedOrder.transfer_reference}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <a
                      href={selectedOrder.mp_payment_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir Comprobante Original
                    </a>
                  </div>
                </div>
              )}

              {/* Resumen Total */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Total abonado</span>
                <span className="text-2xl font-black text-gray-900">${selectedOrder.total?.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
