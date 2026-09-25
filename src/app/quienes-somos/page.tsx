import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { MapPin, Phone, ShieldCheck, Sparkles, Clock, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Quiénes Somos | Soff Productos Capilares',
  description: 'Conocé la historia y el equipo detrás de Soff Productos Capilares en San Miguel de Tucumán.',
}

export default function QuienesSomosPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 antialiased">
      <Header />

      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#002f5b] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Sobre Nosotros
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 font-serif mt-3">
              Nuestra Historia
            </h1>
            <p className="mt-3 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              Pasión por el cuidado capilar, dedicación y compromiso con los profesionales de la belleza y nuestros clientes.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
            {/* Banner con foto y logo */}
            <div className="h-64 sm:h-80 w-full bg-gradient-to-br from-[#002f5b] to-black relative flex items-center justify-center p-8 text-center text-white">
              <div className="space-y-3">
                <img src="/logo.png" alt="Soff" className="h-16 w-auto mx-auto object-contain bg-black px-3 py-1.5 rounded-lg border border-white/20" />
                <h2 className="text-xl sm:text-2xl font-bold font-serif">Soff Productos Capilares</h2>
                <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto flex items-center justify-center gap-1.5">
                  <MapPin size={16} className="text-[#f28599]" /> Av. Independencia 2820, San Miguel de Tucumán
                </p>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Nuestra Misión</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                <p>
                  En <strong>Soff Productos Capilares</strong> nacimos con una misión clara: acercar a peluqueros, estilistas, revendedores y amantes del cabello las mejores marcas del mercado a precios convenientes, con atención personalizada y stock permanente.
                </p>
                <p>
                  Entendemos que el cabello es una parte fundamental de la identidad y la autoestima de cada persona. Por eso seleccionamos cuidadosamente cada producto de nuestro catálogo: shampoos, acondicionadores, baños de crema, matizadores, aceites y tratamientos de nutrición intensiva de primeras marcas como Skala, Fidelité, Novex, Primont y más.
                </p>
                <p>
                  Desde nuestro local ubicado en <strong>Av. Independencia 2820</strong>, brindamos asesoramiento experto y entregas rápidas a toda la provincia de Tucumán y el país.
                </p>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 p-6 rounded-2xl">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Clock size={16} className="text-[#002f5b]" /> Horarios de Atención en el Local:
                  </h3>
                  <p className="text-xs text-gray-600">Lunes a Viernes de 10:00 a 18:00 hs | Sábados de 10:00 a 14:00 hs</p>
                </div>
                <Link
                  href="/productos"
                  className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                >
                  Ver Catálogo <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                🌟
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Marcas Originales</h3>
              <p className="text-gray-500 text-xs leading-relaxed">Garantizamos la autenticidad y trazabilidad de todos los productos capilares que distribuimos.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                🤝
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Asesoramiento Real</h3>
              <p className="text-gray-500 text-xs leading-relaxed">Te ayudamos a elegir la rutina justa según el tipo de cabello, porosidad y necesidad de tratamiento.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                🛵
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Envíos en Tucumán</h3>
              <p className="text-gray-500 text-xs leading-relaxed">Cálculo de envío directo en moto con geolocalización o retiro inmediato en nuestro local.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
