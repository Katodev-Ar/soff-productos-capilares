'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag } from 'lucide-react'
import { useEffect } from 'react'

const navItems = [
  { href: '/mobile/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/mobile/stock', label: 'Stock', icon: Package },
  { href: '/mobile/pedidos', label: 'Pedidos', icon: ShoppingBag },
]

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/mobile'

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Status bar spacer */}
      {!isLoginPage && (
        <div className="bg-black h-[env(safe-area-inset-top,0px)]" />
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isLoginPage ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      {!isLoginPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom,8px)] z-50">
          <div className="flex items-center justify-around h-16">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                    isActive
                      ? 'text-pink-500'
                      : 'text-gray-400 active:text-gray-600'
                  }`}
                >
                  <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
