'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Verification = 'checking' | 'confirmed' | 'not-found'

export default function CheckoutExitoPage() {
  const [verification, setVerification] = useState<Verification>('checking')
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    let active = true

    async function verifyOrder() {
      const requestedId = new URLSearchParams(window.location.search).get('pedido')
      // Nunca afirmar que hubo una compra por haber entrado a esta URL.
      if (!requestedId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)) {
        if (active) setVerification('not-found')
        return
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Sesión no disponible')

        const { data: order, error: orderError } = await supabase.from('orders')
          .select('id')
          .eq('id', requestedId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (orderError || !order?.id) throw new Error('Pedido no encontrado')
        if (!active) return
        setOrderId(order.id)
        setVerification('confirmed')
      } catch {
        if (active) setVerification('not-found')
      }
    }

    void verifyOrder()
    return () => { active = false }
  }, [])

  const confirmed = verification === 'confirmed'

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        {confirmed && (
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {verification === 'checking' ? 'Verificando tu pedido…' : confirmed ? '¡Pedido recibido!' : 'No se pudo confirmar el pedido'}
        </h1>
        {confirmed ? (
          <>
            <p className="text-sm font-medium text-gray-700 mb-3">Referencia: #{orderId.slice(0, 8).toUpperCase()}</p>
            <p className="text-gray-500 mb-8">
              Registramos tu pedido. El comprobante será revisado y el pago confirmado antes de preparar o enviar los productos.
            </p>
          </>
        ) : (
          <p className="text-gray-500 mb-8" role="status">
            {verification === 'checking'
              ? 'Consultando el pedido registrado…'
              : 'No encontramos un pedido verificable para esta cuenta. Revisá Mis pedidos antes de intentar comprar nuevamente.'}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pedidos" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Ver mis pedidos
          </Link>
          <Link href="/productos" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors">
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}
