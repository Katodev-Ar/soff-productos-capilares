'use client'

import Link from 'next/link'

export default function CheckoutPendientePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago pendiente</h1>
        <p className="text-gray-500 mb-8">
          Tu pago está siendo procesado. Te avisaremos por email cuando se confirme. Esto puede demorar unos minutos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pedidos" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Ver mis pedidos
          </Link>
          <Link href="/" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
