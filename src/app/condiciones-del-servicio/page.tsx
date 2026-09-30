import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { FileText, ArrowLeft, CheckCircle2, ShoppingBag, Truck, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Condiciones del Servicio | Soff Productos Capilares',
  description: 'Términos y condiciones comerciales de compra, envíos, medios de pago y políticas de cambio en Soff Productos Capilares.',
}

export default function CondicionesServicioPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft size={16} /> Volver a la tienda
          </Link>
        </div>

        {/* Encabezado */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 text-[#002f5b] text-xs font-bold uppercase tracking-wider mb-4">
            <FileText size={14} className="text-brand-primary" /> Marco Comercial y Términos de Uso
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Condiciones del Servicio
          </h1>
          <p className="mt-3 text-slate-600 leading-relaxed text-sm sm:text-base">
            Bienvenido a <strong>Soff Productos Capilares</strong>. Al acceder a nuestro sitio web, registrarte o realizar compras de nuestros productos capilares y cosméticos, aceptás las siguientes condiciones comerciales y normativas de servicio.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Última actualización: Septiembre de 2026</span>
            <span>•</span>
            <span>Aplicable a compras minoristas y mayoristas</span>
          </div>
        </div>

        {/* Secciones */}
        <div className="space-y-6">
          {/* 1. Objeto y Generalidades */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">1</span>
              Objeto de la Plataforma
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              <strong>Soff Productos Capilares</strong> es una tienda comercial dedicada a la venta de productos de belleza, cosmética, nutrición capilar, tratamientos y cuidado capilar profesional. Las presentes condiciones regulan la relación entre el cliente comprador y el comercio operado en Av. Independencia 2820, San Miguel de Tucumán.
            </p>
          </section>

          {/* 2. Precios y Disponibilidad de Stock */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">2</span>
              Precios, Promociones y Stock
            </h2>
            <ul className="space-y-2.5 text-sm text-slate-700 pl-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  Todos los precios publicados en la tienda están expresados en pesos argentinos (\$ ARS).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  Nos reservamos el derecho de modificar precios, promociones, combos y cupones de descuento sin previo aviso ante variaciones de costos de proveedores o listas oficiales.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  Las compras quedan sujetas a la disponibilidad efectiva de stock en nuestro depósito local al momento de armado del pedido.
                </span>
              </li>
            </ul>
          </section>

          {/* 3. Medios de Pago y Validación */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">3</span>
              Medios de Pago y Verificación de Transferencias
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              La tienda dispone de pago por <strong>Transferencia Bancaria o Billetera Virtual</strong> (Mercado Pago, Cuenta DNI, bancos tradicionales) y pasarela electrónica:
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle size={16} className="text-amber-800" /> Sistema de Verificación de Comprobantes
              </p>
              <p className="text-amber-900">
                Al optar por transferencia bancaria, el cliente debe adjuntar el comprobante emitido por su banco o aplicación. La plataforma cuenta con validación inteligente que verifica el monto exacto, destinatario y número de transacción. Los pedidos no se despachan hasta corroborar la acreditación definitiva de los fondos.
              </p>
            </div>
          </section>

          {/* 4. Métodos de Envío y Retiro */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">4</span>
              Modalidades de Entrega y Envíos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-slate-700 pt-1">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">📍 Retiro en el Local</p>
                <p className="text-slate-600">Sin costo en Av. Independencia 2820, San Miguel de Tucumán. Coordinamos horario una vez preparado.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">🛵 Envío a Domicilio</p>
                <p className="text-slate-600">Calculado por distancia y tiempo estimado según geolocalización. Entrega gratis para pedidos que superen el monto fijado.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">⚡ Uber Moto</p>
                <p className="text-slate-600">El cliente puede enviar un servicio de mensajería o Uber previa coordinación por WhatsApp para verificar que el paquete esté listo.</p>
              </div>
            </div>
          </section>

          {/* 5. Cambios y Devoluciones */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">5</span>
              Política de Cambios y Devoluciones
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Por razones estrictas de higiene y seguridad cosmética, los productos capilares (shampoos, máscaras, sérums, tinturas) solo admiten cambio o devolución si se encuentran <strong>en su envase original cerrado, sellado y sin haber sido abiertos ni utilizados</strong>, dentro de los 10 días corridos posteriores a la compra.
            </p>
          </section>

          {/* 6. Jurisdicción */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Legislación y Jurisdicción Aplicable</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Estas condiciones se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de San Miguel de Tucumán, renunciando a cualquier otro fuero que pudiera corresponder.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
