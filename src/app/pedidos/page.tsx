'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Eye, PackageSearch, CreditCard, Truck } from 'lucide-react'

export default function PedidosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')

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
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
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

  const primaryAddress = profile?.addresses?.[0]

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900 uppercase">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p>{email}</p>
                <p>DNI / CUIT: {profile?.dni || '-'}</p>
                <p>Teléfono: {profile?.phone || '-'}</p>
              </div>
            </div>

            {/* Mis Direcciones */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Mis direcciones</h3>
                <Link href="/cuenta" className="text-sm font-semibold text-gray-900 hover:underline">
                  Editar
                </Link>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {primaryAddress ? (
                  <>
                    <p className="font-medium text-gray-900">{primaryAddress.address}</p>
                    <p>{primaryAddress.city} {primaryAddress.cp && `, CP ${primaryAddress.cp}`}</p>
                    <p>Argentina</p>
                  </>
                ) : (
                  <p className="text-gray-400 italic">No hay direcciones registradas.</p>
                )}
                
                {profile?.addresses?.length > 1 && (
                  <Link href="/cuenta" className="block mt-4 font-semibold text-gray-900 hover:underline">
                    Otras direcciones
                  </Link>
                )}
              </div>
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
                <p className="text-gray-500 mb-6">Cuando realices una compra, podrás hacer el seguimiento desde acá.</p>
                <Link href="/productos" className="inline-block bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
                  Ir a la tienda
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const isPending = order.status === 'pending'
                  const isCompleted = order.status === 'completed'
                  const isTransfer = order.mp_payment_id?.includes('receipts')

                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-[#f0f0f0] px-6 py-3 flex justify-between items-center">
                        <span className="font-bold text-gray-900">
                          Orden: #{order.id.slice(0, 4).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                          {new Date(order.created_at).toLocaleDateString('es-AR')}
                          <button className="text-gray-900 hover:text-black">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 font-medium">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Pago:</span>
                              <span className={isCompleted ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-red-600'}>
                                {isCompleted ? 'Aprobado' : isPending ? 'Pendiente' : 'Cancelado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-medium">
                              <Truck className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Envío:</span>
                              <span className="text-gray-900">
                                {isCompleted ? 'En preparación' : 'No enviado'}
                              </span>
                            </div>

                            <div className="mt-6">
                              <p className="text-2xl font-bold text-gray-900">
                                ${order.total?.toLocaleString('es-AR')}
                              </p>
                              <button className="text-xs font-bold text-gray-900 hover:underline mt-1">
                                Ver detalle {'>'}
                              </button>
                            </div>
                          </div>

                          {/* Placeholder Image (Since we don't have order items in the DB yet) */}
                          <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-lg flex flex-col items-center justify-center p-2 text-center shrink-0">
                            <PackageSearch className="w-8 h-8 text-gray-300 mb-1" />
                            <span className="text-[10px] text-gray-400 font-medium leading-tight">Productos de tu orden</span>
                          </div>
                        </div>

                        {/* Payment Button if Pending */}
                        {isPending && !isTransfer && (
                          <div className="mt-6">
                            <Link 
                              href="/checkout"
                              className="block w-full text-center bg-black text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors"
                            >
                              Realizar el pago
                            </Link>
                          </div>
                        )}
                        {isPending && isTransfer && (
                          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 text-center">
                            Comprobante de transferencia enviado. Estamos verificando tu pago.
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
    </div>
  )
}
