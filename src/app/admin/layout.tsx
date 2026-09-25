'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings,
  UploadCloud,
  LogOut,
  Menu,
  X,
  Gift,
  Image as ImageIcon,
  BadgePercent
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/admin/pedidos', icon: Package },
    { name: 'Productos', href: '/admin/productos', icon: ShoppingBag },
    { name: 'Importar Stock', href: '/admin/stock', icon: UploadCloud },
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Combos', href: '/admin/combos', icon: Gift },
    { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
    { name: 'Cupones', href: '/admin/cupones', icon: BadgePercent },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex mt-[60px]">
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-[70px] left-4 z-50 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-gray-900"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span className="sr-only">Abrir menú sidebar</span>
        {isMobileMenuOpen ? (
          <X className="block h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="block h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Sidebar for desktop & mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 mt-[60px] lg:mt-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
                >
                  <item.icon
                    className={`
                      flex-shrink-0 -ml-1 mr-3 h-5 w-5
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                    `}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </div>

          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
            >
              <LogOut className="flex-shrink-0 -ml-1 mr-3 h-5 w-5 text-gray-400" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
