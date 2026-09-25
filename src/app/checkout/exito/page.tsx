'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useEffect } from 'react'

export default function CheckoutExitoPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">¡Pago aprobado!</h1>
        <p className="text-gray-500 mb-8">
          Tu pedido fue procesado con éxito. Te enviaremos un email con los detalles de tu compra y el seguimiento del envío.
        </p>
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
