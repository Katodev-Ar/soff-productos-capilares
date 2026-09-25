'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, FileText, ArrowLeft, CheckCircle2, Lock, Smartphone, Database, CreditCard, Scale, HelpCircle } from 'lucide-react'

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<'terminos' | 'privacidad'>('terminos')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Superior */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              title="Volver al inicio"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-[#002f5b]">Soff</span>
                <span className="text-xs text-slate-500 font-medium">Productos Capilares</span>
              </div>
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">Marco Legal y Términos</h1>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <span>Versión 2.4</span>
            <span className="mx-1.5">•</span>
            <span>Septiembre 2026</span>
          </div>
        </div>
      </header>

      {/* Hero informativo */}
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Transparencia, Seguridad y Confianza
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Documentación legal contractual y políticas de privacidad para comercios, kioscos, tiendas y mayoristas. Conforme a la <strong>Ley 25.326 de Argentina</strong>, <strong>GDPR</strong> y las políticas de <strong>Google Play</strong> y <strong>Apple App Store</strong>.
              </p>
            </div>

            {/* Selector de pestañas */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1.5 shadow-inner">
              <button
                onClick={() => setActiveTab('terminos')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'terminos'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={16} />
                <span>Términos del Servicio</span>
              </button>
              <button
                onClick={() => setActiveTab('privacidad')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'privacidad'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield size={16} />
                <span>Política de Privacidad</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {activeTab === 'terminos' ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <div className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <FileText size={14} /> Contrato Comercial SaaS B2B
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">Términos y Condiciones del Servicio</h2>
              <p className="mt-1 text-sm text-slate-500">Última revisión: 8 de septiembre de 2026 • Aplicable a versión Móvil, Desktop (PC) y Web</p>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-slate-700 sm:text-base">
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">1</span>
                  Identificación, Alcance y Aceptación Contractual
                </h3>
                <p>
                  El presente contrato regula el acceso, licenciamiento y uso del software comercial de punto de venta, gestión de stock y facturación <strong>Nexo POS</strong> (incluyendo `StockApp` para escritorio y la app móvil para Android e iOS), operado por <strong>Nexo POS Soluciones Tecnológicas</strong>.
                </p>
                <p>
                  Al descargar, instalar, registrarse o abonar cualquier suscripción, el titular del comercio (el "Cliente") y los usuarios autorizados dependientes aceptan de manera plena y sin reservas estos Términos. Quien suscribe en representación de una persona jurídica declara contar con facultades legales suficientes para obligarla.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">2</span>
                  Modelo de Negocio SaaS Comercial y Licenciamiento
                </h3>
                <p>
                  Nexo POS opera bajo la modalidad de <strong>Software como Servicio (SaaS)</strong>. El acceso a la plataforma se otorga mediante licencias comerciales temporales no exclusivas, vinculadas a planes de suscripción mensual o anual para comercios minoristas, kioscos, minimercados, tiendas y distribuidores mayoristas.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Planes Periódicos</p>
                    <p className="text-xs text-slate-600 mt-1">Suscripciones mensuales y anuales con soporte técnico y actualizaciones automáticas.</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Sin Permanencia</p>
                    <p className="text-xs text-slate-600 mt-1">Cancelación voluntaria en cualquier momento sin cargos punitorios ocultos.</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Período de Prueba</p>
                    <p className="text-xs text-slate-600 mt-1">Acceso demostrativo para evaluar el sistema antes del primer cargo comercial.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">3</span>
                  Seguridad, Multi-Tenancy y Aislamiento en la Nube
                </h3>
                <p>
                  Los datos de stock, ventas, clientes, compras, gastos y empleados se procesan y almacenan en infraestructuras cloud de alta disponibilidad (<strong>PostgreSQL gestionado sobre Supabase</strong>), bajo una rigurosa arquitectura de aislamiento multi-inquilino (*Multi-Tenancy Segregation*):
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Aislamiento por Comercio (`store_id`):</strong> Cada registro está estrictamente vinculado de forma unívoca a la cuenta del comercio titular.</li>
                  <li><strong>Políticas RLS (Row-Level Security):</strong> Controles a nivel de motor de base de datos que impiden que consultas o usuarios de un comercio accedan a información de otros establecimientos.</li>
                  <li><strong>Cifrado Integral:</strong> Transmisión de datos mediante protocolos seguros TLS 1.3 / HTTPS y cifrado de volúmenes en reposo (AES-256).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">4</span>
                  Titularidad y Responsabilidad sobre los Datos Comerciales
                </h3>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
                  <p className="font-bold flex items-center gap-2">
                    <Database size={18} /> Propiedad Exclusiva del Comercio
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-amber-800">
                    El Comercio es el único y exclusivo propietario de sus catálogos, costos, historial de transacciones, métricas de caja y bases de datos de clientes finales. Nexo POS actúa únicamente como custodio técnico y proveedor del software.
                  </p>
                </div>
                <p>
                  El Comercio es responsable de la veracidad y legalidad de la información ingresada, así como del cumplimiento de sus deberes comerciales frente a sus propios clientes y ante los organismos fiscales. El Cliente podrá exportar en todo momento sus bases maestras en formatos abiertos (CSV, Excel, JSON).
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">5</span>
                  Pasarelas de Cobro Externas y Facturación Fiscal (AFIP)
                </h3>
                <p>
                  <strong>Cobros Digitales:</strong> Nexo POS se integra con servicios de terceros (Mercado Pago, terminales Point y QR interoperable). Nexo POS <strong>NO almacena números de tarjetas de crédito o débito, códigos CVV ni datos sensibles de bandas magnéticas</strong>, delegando la captura a pasarelas certificadas bajo normas PCI-DSS. Nexo POS no es entidad financiera ni intermedia fondos fiduciarios.
                </p>
                <p>
                  <strong>Facturación Fiscal Electrónica:</strong> La plataforma facilita la emisión de comprobantes autorizados con CAE y código QR fiscal ante la <strong>AFIP / ARCA</strong>. La validez fiscal, certificados digitales y exactitud impositiva son responsabilidad exclusiva e indelegable del contribuyente titular.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">6</span>
                  Suscripciones, Pagos Recurrentes, Cancelaciones y Reembolsos
                </h3>
                <p>
                  Los cobros de suscripción se facturan por adelantado de forma recurrente. El Cliente puede cancelar el servicio cuando lo desee desde su panel; la baja se hará efectiva al vencer el período facturado sin penalidades. Los períodos transcurridos no admiten reembolso debido a la disponibilidad inmediata del servicio cloud.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">7</span>
                  Ley Aplicable y Jurisdicción
                </h3>
                <p>
                  Estos Términos se rigen por las leyes de la <strong>República Argentina</strong>. Cualquier diferendo derivado del presente será resuelto por los Tribunales Ordinarios en lo Comercial con asiento en la Ciudad Autónoma de Buenos Aires, con renuncia a cualquier otro fuero.
                </p>
              </section>
            </div>
          </article>
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <Shield size={14} /> Privacidad y Protección de Datos
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">Política de Privacidad y Tratamiento de Datos</h2>
              <p className="mt-1 text-sm text-slate-500">Conforme a la Ley 25.326 de Argentina, GDPR y Políticas de Google Play / Apple App Store</p>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-slate-700 sm:text-base">
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">1</span>
                  Marco Normativo y Principios de Privacidad
                </h3>
                <p>
                  Nexo POS garantiza la protección de los datos personales en concordancia estricta con la <strong>Ley de Protección de los Datos Personales N° 25.326 de la República Argentina</strong>, las directivas de la <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> y los principios de licitud y minimización del <strong>Reglamento General de Protección de Datos (GDPR UE 2016/679)</strong>.
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-600">
                  <strong>Distinción de Roles Legales:</strong> El Comercio opera como <em>Responsable del Tratamiento</em> respecto de los datos personales de sus propios clientes y empleados. Nexo POS actúa como <em>Encargado del Tratamiento</em> y custodio técnico de la infraestructura cloud, y como Responsable únicamente respecto de los datos de contacto y facturación del titular suscriptor.
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">2</span>
                  Declaración Expresa de Permisos del Dispositivo (Apps Móviles)
                </h3>
                <p className="text-slate-600">
                  En cumplimiento con las políticas de Google Play Store y Apple App Store, transparentamos el uso exacto y estricto de cada permiso de hardware:
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Smartphone className="text-indigo-600" size={18} />
                      <span>Cámara Fotográfica</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      <strong>Finalidad:</strong> Escaneo óptico en tiempo real de códigos de barras (EAN-13, CODE128) y códigos QR de productos o facturas.
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                      ✓ No graba video, no almacena fotos ni reconoce rostros.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Lock className="text-indigo-600" size={18} />
                      <span>Red Local y Wi-Fi</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      <strong>Finalidad:</strong> Detección y envío de tickets a impresoras térmicas ESC/POS en red local y conexión directa con PC mostrador.
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                      ✓ Tráfico cifrado, sin inspección de redes ajenas.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Database className="text-indigo-600" size={18} />
                      <span>Almacenamiento Local</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      <strong>Finalidad:</strong> Base de datos local (SQLite / AsyncStorage) para permitir ventas offline sin Internet y exportar reportes en PDF/Excel.
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                      ✓ Aislamiento en sandbox seguro del dispositivo.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <CreditCard className="text-indigo-600" size={18} />
                      <span>Seguridad en Cobros</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      <strong>Finalidad:</strong> Conexión con terminales Point y lectores bluetooth.
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                      ✓ Cumplimiento PCI-DSS: 0 tarjetas almacenadas.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">3</span>
                  Derechos ARCO y Portabilidad
                </h3>
                <p>
                  Conforme a la Ley 25.326 y al GDPR, usted tiene derecho permanente a:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Acceso:</strong> Solicitar copia íntegra de sus datos personales registrados.</li>
                  <li><strong>Rectificación:</strong> Actualizar o enmendar datos erróneos o desactualizados.</li>
                  <li><strong>Supresión ("Derecho al Olvido"):</strong> Solicitar el borrado definitivo de su información.</li>
                  <li><strong>Portabilidad:</strong> Descargar catálogos y reportes en formato estructurado (CSV/Excel/JSON).</li>
                </ul>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
                  <strong>Autoridad de Control en Argentina:</strong> La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA (AAIP), órgano de control de la Ley N° 25.326, atiende reclamos por incumplimiento (Av. Pte. Julio A. Roca 710, Piso 3°, CABA | www.argentina.gob.ar/aaip | info@aaip.gob.ar).
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">4</span>
                  Eliminación de Cuenta (Requisito Google Play & Apple App Store)
                </h3>
                <p>
                  Cualquier usuario puede solicitar la baja y eliminación total de su cuenta y de sus datos asociados directamente desde:
                </p>
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs sm:text-sm text-red-900">
                  <p className="font-bold">Mecanismo In-App y Web:</p>
                  <p className="mt-1">
                    Acceda a <strong>Mi Perfil &gt; Seguridad y Privacidad &gt; Eliminar mi Cuenta</strong>, o remita un correo a <code>soporte@nexopos.com</code> solicitando el borrado definitivo. La información se purga en un plazo máximo de 30 días, preservando únicamente registros de respaldo requeridos por normas tributarias.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">5</span>
                  Contacto y Asuntos Legales
                </h3>
                <p>
                  Para ejercer sus derechos ARCO o plantear consultas legales y de privacidad:
                </p>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs sm:text-sm space-y-1 text-slate-700">
                  <p><strong>Nexo POS Soluciones Tecnológicas</strong></p>
                  <p>Asuntos Legales y DPO: <a href="mailto:legal@nexopos.com" className="text-indigo-600 underline">legal@nexopos.com</a></p>
                  <p>Soporte al Cliente: <a href="mailto:soporte@nexopos.com" className="text-indigo-600 underline">soporte@nexopos.com</a></p>
                  <p>Jurisdicción: Ciudad Autónoma de Buenos Aires, República Argentina</p>
                </div>
              </section>
            </div>
          </article>
        )}

        {/* Banner de descarga del documento completo */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white sm:flex-row sm:px-8">
          <div>
            <h4 className="text-base font-bold sm:text-lg">¿Necesitás el documento legal completo en Markdown?</h4>
            <p className="text-xs text-slate-300 sm:text-sm">El archivo legal oficial está integrado en la raíz del proyecto para auditorías y publicación en tiendas.</p>
          </div>
          <a
            href="/TERMINOS_Y_POLITICA_PRIVACIDAD_NEXO_POS.md"
            target="_blank"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-indigo-400"
          >
            <FileText size={16} />
            <span>Descargar Documento</span>
          </a>
        </div>
      </main>
    </div>
  )
}
