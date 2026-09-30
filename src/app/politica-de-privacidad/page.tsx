import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Shield, ArrowLeft, Lock, Eye, FileText, CheckCircle2, UserCheck, Mail } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidad | Soff Productos Capilares',
  description: 'Conoce cómo protegemos y gestionamos tus datos personales en Soff Productos Capilares según la Ley 25.326 y estándares de privacidad.',
}

export default function PoliticaPrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Breadcrumb y Volver */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-primary transition-colors"
          >
            <ArrowLeft size={16} /> Volver a la tienda
          </Link>
        </div>

        {/* Encabezado Principal */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 text-[#002f5b] text-xs font-bold uppercase tracking-wider mb-4">
            <Shield size={14} className="text-brand-primary" /> Privacidad y Protección de Datos
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Política de Privacidad
          </h1>
          <p className="mt-3 text-slate-600 leading-relaxed text-sm sm:text-base">
            En <strong>Soff Productos Capilares</strong> (con domicilio comercial en Av. Independencia 2820, San Miguel de Tucumán, Argentina), la privacidad y protección de los datos personales de nuestros clientes y visitantes es una prioridad absoluta. El presente documento detalla la forma en que recopilamos, utilizamos, almacenamos y resguardamos tu información, en estricto cumplimiento de la <strong>Ley Nacional N° 25.326 de Protección de los Datos Personales de la República Argentina</strong> y los estándares de seguridad digital.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Última actualización: Septiembre de 2026</span>
            <span>•</span>
            <span>Ámbito: Plataforma Web y Autenticación OAuth</span>
          </div>
        </div>

        {/* Secciones de la Política */}
        <div className="space-y-6">
          {/* 1. Información que recopilamos */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">1</span>
              Información que Recopilamos
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Recopilamos únicamente la información necesaria para brindarte una experiencia de compra eficiente, personalizada y segura:
            </p>
            <ul className="space-y-3 text-sm text-slate-700 pl-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  <strong>Inicio de Sesión con Google (OAuth 2.0):</strong> Al acceder mediante tu cuenta de Google, solicitamos acceso a tu perfil público básico (nombre, dirección de correo electrónico y fotografía de perfil). <em>No tenemos acceso a tus contraseñas, correos privados ni archivos de Google Drive.</em>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  <strong>Datos para Envíos y Facturación:</strong> Dirección postal en San Miguel de Tucumán o resto de Argentina, teléfono de contacto y nombre del receptor para coordinar entregas a domicilio, Uber Moto o retiro en el local.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 flex-none mt-0.5" />
                <span>
                  <strong>Comprobantes de Pago:</strong> Comprobantes de transferencia bancaria que subas voluntariamente en el proceso de pago para validar la acreditación de tu pedido.
                </span>
              </li>
            </ul>
          </section>

          {/* 2. Finalidad del tratamiento */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">2</span>
              Uso de la Información
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Tus datos son utilizados exclusivamente para:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">📦 Gestión de Pedidos</p>
                <p className="text-slate-600">Procesar compras, preparar paquetes y coordinar logística de envío.</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">🔑 Autenticación Segura</p>
                <p className="text-slate-600">Identificar tu cuenta, guardar tus productos favoritos y mostrar tu historial.</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">💬 Notificaciones de Compra</p>
                <p className="text-slate-600">Avisarte por email o WhatsApp cuando tu pedido esté listo para retirar o en camino.</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1">🛡️ Seguridad Antifraude</p>
                <p className="text-slate-600">Verificar comprobantes de transferencia y resguardar la seguridad de la tienda.</p>
              </div>
            </div>
          </section>

          {/* 3. Protección y Confidencialidad */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">3</span>
              Seguridad, Almacenamiento y No Divulgación
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              <strong>Soff Productos Capilares jamás vende, alquila ni comercializa datos personales de usuarios con terceros</strong> con fines publicitarios o lucrativos.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Toda la infraestructura opera sobre servidores cifrados con protocolo TLS/HTTPS de extremo a extremo, respaldados por la plataforma en la nube Supabase y Vercel, cumpliendo con estándares internacionales de seguridad (SOC 2, ISO 27001).
            </p>
          </section>

          {/* 4. Derechos del Titular (Ley 25.326) */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-[#002f5b]">4</span>
              Tus Derechos (Acceso, Rectificación y Supresión)
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Conforme a los Artículos 14 y 16 de la Ley 25.326, tenés derecho a solicitar en forma gratuita y en intervalos no inferiores a 6 meses el acceso a tus datos personales, así como a exigir su rectificación, actualización o eliminación definitiva de nuestra base de datos en cualquier momento.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs sm:text-sm text-blue-900 flex items-start gap-3">
              <UserCheck size={20} className="text-blue-700 flex-none mt-0.5" />
              <div>
                <p className="font-bold">¿Cómo ejercer tus derechos?</p>
                <p className="mt-0.5 text-blue-800">
                  Podés solicitar la baja de tu cuenta o modificación de datos escribiéndonos a nuestro WhatsApp oficial <strong>+54 9 381 625-3929</strong> o visitándonos en nuestro local de Av. Independencia 2820, San Miguel de Tucumán.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Contacto */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Contacto y Consultas</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Para cualquier duda relativa a esta Política de Privacidad o al tratamiento de tus datos personales, podés comunicarte por nuestros canales oficiales:
            </p>
            <div className="space-y-2 text-sm text-slate-800">
              <p>📍 <strong>Local Comercial:</strong> Av. Independencia 2820, San Miguel de Tucumán (CP 4000), Tucumán, Argentina.</p>
              <p>📱 <strong>WhatsApp de Atención:</strong> +54 9 381 625-3929</p>
              <p>📸 <strong>Instagram Oficial:</strong> @soffproductoscapilares</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
