'use client'

import Link from 'next/link'

export default function CheckoutErrorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">El pago no se pudo procesar</h1>
        <p className="text-gray-500 mb-8">
          Hubo un problema con tu pago. No te preocupes, no se realizó ningún cobro. Podés intentar de nuevo o elegir otro medio de pago.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/checkout" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Reintentar pago
          </Link>
          <Link href="/" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
