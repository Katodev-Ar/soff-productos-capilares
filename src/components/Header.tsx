'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Heart,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  X,
  Package,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'

const navLinks = [
  {
    label: 'Productos',
    href: '/productos',
    dropdown: [
      { label: 'Shampoo', href: '/productos?categoria=SHAMPOO' },
      { label: 'Acondicionador', href: '/productos?categoria=ACONDICIONADOR' },
      { label: 'Máscaras', href: '/productos?categoria=MASCARAS' },
      { label: 'Ampollas', href: '/productos?categoria=AMPOLLAS' },
      { label: 'Cepillos', href: '/productos?categoria=CEPILLOS' },
    ],
  },
  {
    label: 'Rutinas',
    href: '/#rutinas',
    dropdown: [
      { label: 'Hidratación', href: '/productos?q=hidratacion' },
      { label: 'Reparación', href: '/productos?q=reparacion' },
      { label: 'Matizadores', href: '/productos?categoria=MATIZADORES' },
    ],
  },
  {
    label: 'Colecciones',
    href: '/productos?categoria=SKALA%20POTE',
    dropdown: [
      { label: 'Skala pote', href: '/productos?categoria=SKALA%20POTE' },
      { label: 'Barbería', href: '/productos?categoria=BARBERIA' },
      { label: 'Peines', href: '/productos?categoria=PEINES' },
      { label: 'Oportunidades', href: '/productos?orden=stock' },
    ],
  },
  {
    label: 'Coloración',
    href: '/productos?q=tintura',
    dropdown: [
      { label: 'Tinturas Fidelite', href: '/productos?categoria=TINTURAS%20FIDELITE' },
      { label: 'Tinturas NOV', href: '/productos?categoria=TINTURAS%20NOV' },
      { label: 'Tinturas Iyosei', href: '/productos?categoria=TINTURAS%20IYOSEI' },
      { label: 'Oxidantes', href: '/productos?categoria=OXIDANTES' },
      { label: 'Decolorantes', href: '/productos?categoria=POLVOS%20DECOLORANTES' },
    ],
  },
  {
    label: 'Mayoristas',
    href: '/mayoristas',
  },
  {
    label: 'Fijación',
    href: '/productos?categoria=SPRAY%20FIJADOR',
    dropdown: [
      { label: 'Gel', href: '/productos?categoria=GEL' },
      { label: 'Cera', href: '/productos?categoria=CERA' },
      { label: 'Spray fijador', href: '/productos?categoria=SPRAY%20FIJADOR' },
      { label: 'Brillos', href: '/productos?categoria=BRILLOS' },
    ],
  },
  { label: 'Quiénes Somos', href: '/quienes-somos' },
  { label: 'Dónde Encontrarnos', href: '/#ubicacion' },
  { label: 'Oportunidades', href: '/#oportunidades' },
]

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('minorista')
  const [userName, setUserName] = useState('Usuario')
  const [userEmail, setUserEmail] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { cartCount, setIsCartOpen } = useCart()
  const { favoriteCount } = useFavorites()
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoggedIn(false)
        return
      }

      setIsLoggedIn(true)
      setUserEmail(user.email || '')

      const { data: profile } = await supabase.from('profiles').select('first_name, role').eq('id', user.id).maybeSingle()
      if (profile) {
        setUserRole(profile.role || 'minorista')
        if (profile.first_name) setUserName(profile.first_name)
      }
    }

    void fetchUser()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = searchQuery.trim()
    router.push(term ? `/productos?q=${encodeURIComponent(term)}` : '/productos')
    setIsMenuOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsProfileOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <header className="fixed z-50 w-full border-b border-gray-200 bg-white text-black transition-all">
        {/* Marquee Top Bar */}
        <div className="bg-[#f28599] text-white py-2 overflow-hidden whitespace-nowrap flex items-center relative z-50">
          <div className="animate-marquee inline-block text-[11px] sm:text-xs font-bold tracking-wide uppercase">
            <span className="mx-8">Visita nuestro local en Av. Independencia 2820 de Lun a Vie de 10h a 18h y Sáb de 10h a 14h</span>
            <span className="mx-8">•</span>
            <span className="mx-8">5% OFF llevando más de $45.000</span>
            <span className="mx-8">•</span>
            <span className="mx-8">10% OFF llevando más de $70.000</span>
            <span className="mx-8">•</span>
            <span className="mx-8">Visita nuestro local en Av. Independencia 2820 de Lun a Vie de 10h a 18h y Sáb de 10h a 14h</span>
            <span className="mx-8">•</span>
            <span className="mx-8">5% OFF llevando más de $45.000</span>
            <span className="mx-8">•</span>
            <span className="mx-8">10% OFF llevando más de $70.000</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-5 py-4 lg:gap-8">
            <Link href="/" className="flex flex-none items-center" aria-label="Ir al inicio">
              <img src="/logo.png" alt="Soff" className="h-10 w-auto bg-black object-contain px-2 py-1" />
            </Link>

            <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
              <div className="relative w-full max-w-2xl">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="¿Qué estás buscando?"
                  className="w-full rounded-full bg-[#f4f4f4] py-2.5 pl-6 pr-12 text-sm outline-none ring-1 ring-transparent transition focus:ring-gray-300"
                />
                <button
                  type="submit"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#002f5b]"
                  aria-label="Buscar productos"
                >
                  <Search size={18} />
                </button>
              </div>
            </form>

            <div className="flex items-center space-x-5 sm:space-x-6">
              <div className="relative" ref={profileRef}>
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((current) => !current)}
                    className="flex items-center space-x-2 text-sm text-gray-700 hover:text-black"
                    aria-expanded={isProfileOpen}
                    aria-label="Abrir menú de perfil"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-primary bg-brand-primary/20">
                      <User size={16} className="text-brand-primary" />
                    </div>
                    <span className="hidden font-medium lg:inline">{userName}</span>
                  </button>
                ) : (
                  <Link href="/login" className="flex items-center space-x-2 text-sm text-gray-700 hover:text-black">
                    <User size={20} strokeWidth={1.5} />
                    <span className="hidden lg:inline">Iniciar sesión</span>
                  </Link>
                )}

                {isProfileOpen && isLoggedIn && (
                  <div className="absolute right-0 top-12 z-[100] w-72 overflow-hidden rounded-2xl border border-gray-700/50 bg-[#1a1f2e] text-white shadow-2xl">
                    <div className="flex flex-col items-center border-b border-gray-700/50 px-4 pb-4 pt-6">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-primary bg-[#2a3040]">
                        <User size={28} className="text-brand-primary" />
                      </div>
                      <p className="text-base font-bold">{userName}</p>
                      <p className="text-xs text-gray-400">{userEmail}</p>
                    </div>

                    <div className="flex gap-2 border-b border-gray-700/50 px-4 py-3">
                      <Link
                        href="/pedidos"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-brand-primary/40 bg-brand-primary/20 py-2 text-center text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/30"
                      >
                        <ShoppingBag size={14} /> Mis pedidos
                      </Link>
                      <Link
                        href="/historial"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-600/50 bg-gray-700/50 py-2 text-center text-xs font-bold text-gray-300 transition-colors hover:bg-gray-600/50"
                      >
                        <ClipboardList size={14} /> Historial
                      </Link>
                    </div>

                    <nav className="py-2">
                      <Link href="/" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                        <Home size={18} className="text-gray-400" />
                        <span className="text-sm">Inicio</span>
                      </Link>
                      <Link href="/notificaciones" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                        <Bell size={18} className="text-gray-400" />
                        <span className="text-sm">Notificaciones</span>
                      </Link>
                      <Link href="/favoritos" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                        <Heart size={18} className="text-red-400" />
                        <span className="text-sm">Favoritos</span>
                        {favoriteCount > 0 && (
                          <span className="ml-auto rounded-full bg-red-500/20 text-red-400 px-2 py-0.5 text-[10px] font-bold">
                            {favoriteCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/pedidos" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                        <Package size={18} className="text-gray-400" />
                        <span className="text-sm">Mis pedidos</span>
                      </Link>
                      <Link href="/cuenta" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                        <Settings size={18} className="text-gray-400" />
                        <span className="text-sm">Mi perfil</span>
                      </Link>

                      {userRole === 'admin' && (
                        <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/5">
                          <ShieldCheck size={18} className="text-brand-primary" />
                          <span className="text-sm font-semibold">Panel Admin</span>
                          <span className="ml-auto rounded bg-brand-primary px-2 py-0.5 text-[9px] font-bold uppercase text-black">Admin</span>
                        </Link>
                      )}
                    </nav>

                    <div className="border-t border-gray-700/50 p-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut size={18} />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link 
                href="/favoritos" 
                className="relative text-gray-700 hover:text-red-500 transition-colors hidden sm:block p-1" 
                aria-label="Ver favoritos"
                title="Mis Favoritos"
              >
                <Heart size={20} strokeWidth={1.5} className={favoriteCount > 0 ? "text-red-500 fill-red-500" : ""} />
                {favoriteCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-xs">
                    {favoriteCount}
                  </span>
                )}
              </Link>

              <button type="button" onClick={() => setIsCartOpen(true)} className="relative text-gray-700 hover:text-black p-1" aria-label="Abrir carrito">
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>

              <button type="button" className="text-gray-700 md:hidden" onClick={() => setIsMenuOpen((current) => !current)} aria-label="Abrir menú">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          <nav className="hidden items-center space-x-8 pb-3 md:flex">
            {navLinks.map((item) => (
              <div key={item.label} className="group relative pb-1">
                <Link href={item.href} className="flex items-center text-[13px] font-bold text-[#002f5b] hover:text-brand-primary">
                  {item.label}
                  {item.dropdown && <ChevronDown size={12} className="ml-1 opacity-70" />}
                </Link>
                {item.dropdown && (
                  <div className="invisible absolute left-0 top-full z-[80] min-w-56 translate-y-2 rounded-lg border border-gray-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.dropdown.map((link) => (
                      <Link key={link.label} href={link.href} className="block rounded px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand-primary">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {isMenuOpen && (
          <div className="overflow-hidden border-t bg-white md:hidden">
            <div className="space-y-4 p-4">
              <form onSubmit={handleSearch} className="flex overflow-hidden rounded-full bg-[#f4f4f4]">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar productos"
                  className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
                />
                <button type="submit" className="flex w-11 items-center justify-center text-gray-600" aria-label="Buscar">
                  <Search size={18} />
                </button>
              </form>

              <Link href={isLoggedIn ? '/cuenta' : '/login'} onClick={() => setIsMenuOpen(false)} className="block border-b py-2 font-medium text-gray-800">
                Mi cuenta
              </Link>
              {userRole === 'admin' && (
                <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="block border-b py-2 font-bold text-black">
                  Panel Admin
                </Link>
              )}
              {navLinks.map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setIsMenuOpen(false)} className="block border-b py-2 font-medium text-gray-800 last:border-b-0">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="h-[132px] md:h-[136px]" />
    </>
  )
}
