'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return

    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="mt-auto border-t border-gray-800 bg-brand-secondary pb-8 pt-16 text-white">
      <div className="mx-auto mb-12 grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:px-8">
        <div className="flex flex-col space-y-4">
          <img src="/logo.png" alt="Soff Productos Capilares" className="mb-2 h-16 w-auto object-contain" />
          <p className="text-sm leading-6 text-gray-400">
            Productos capilares para rutinas profesionales, venta minorista y precios especiales por perfil.
          </p>
          <div className="flex space-x-4 pt-2 text-gray-400">
            <a href="https://www.instagram.com/soffproductoscapilares" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary" aria-label="Instagram de Soff">
              <InstagramIcon />
            </a>
            <a href="https://www.facebook.com/soffproductoscapilares" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary" aria-label="Facebook de Soff">
              <FacebookIcon />
            </a>
          </div>
        </div>

        <div className="flex flex-col">
          <h5 className="mb-6 border-b border-gray-700 pb-2 text-sm font-bold uppercase tracking-wider text-white">Navegación</h5>
          <ul className="space-y-3">
            <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Inicio</Link></li>
            <li><Link href="/productos" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Tienda online</Link></li>
            <li><Link href="/#rutinas" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Rutinas</Link></li>
            <li><Link href="/#ubicacion" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Dónde encontrarnos</Link></li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h5 className="mb-6 border-b border-gray-700 pb-2 text-sm font-bold uppercase tracking-wider text-white">Ayuda</h5>
          <ul className="space-y-3">
            <li><Link href="/checkout" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Envíos y pago</Link></li>
            <li><Link href="/pedidos" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Mis pedidos</Link></li>
            <li><Link href="/cuenta" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Mi perfil</Link></li>
            <li><Link href="/legal" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">Términos y Privacidad</Link></li>
            <li>
              <a href="https://www.instagram.com/soffproductoscapilares" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 transition-colors hover:text-brand-primary">
                Contacto
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h5 className="mb-6 border-b border-gray-700 pb-2 text-sm font-bold uppercase tracking-wider text-white">Suscribite</h5>
          <p className="mb-4 text-sm leading-6 text-gray-400">Recibí novedades y descuentos exclusivos.</p>
          <form className="mt-2 flex flex-col space-y-2" onSubmit={handleSubscribe}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setSubscribed(false)
                }}
                placeholder="Tu correo electrónico"
                className="w-full rounded border border-gray-700 bg-black px-4 py-3 pl-10 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-primary"
              />
            </div>
            <button type="submit" className="rounded bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-pink-300">
              Suscribirme
            </button>
          </form>
          {subscribed && (
            <p className="mt-3 flex items-center gap-2 text-sm text-brand-primary">
              <Check size={16} /> Gracias, te sumamos a la lista local.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-gray-800 px-4 pt-8 sm:px-6 md:flex-row lg:px-8">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Soff Productos Capilares. Todos los derechos reservados.</p>
        <a
          href="https://www.google.com/maps/search/?api=1&query=Av.%20Independencia%202820%2C%20San%20Miguel%20de%20Tucum%C3%A1n"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-400 transition-colors hover:text-brand-primary"
        >
          <MapPin size={14} /> Av. Independencia 2820, San Miguel de Tucumán
        </a>
      </div>
    </footer>
  )
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
