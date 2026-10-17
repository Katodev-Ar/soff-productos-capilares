'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_STOREFRONT_THEME, isStorefrontTheme, type StorefrontTheme } from '@/lib/storefrontTheme'

const POLL_INTERVAL_MS = 45_000

type ThemeContextValue = {
  theme: StorefrontTheme
  refreshTheme: () => Promise<void>
}
const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_STOREFRONT_THEME,
  refreshTheme: async () => {},
})

export function StorefrontThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<StorefrontTheme>(DEFAULT_STOREFRONT_THEME)
  const refreshTheme = useCallback(async () => {
    // Vista previa por enlace: solamente altera esta pestaña, nunca Supabase.
    const preview = new URLSearchParams(window.location.search).get('soff_preview')
    if (isStorefrontTheme(preview)) { setTheme(preview); return }
    try {
      const response = await fetch('/api/storefront/theme', { cache: 'no-store' })
      if (!response.ok) return // conservar la última apariencia válida, sin inventar resultados
      const data: unknown = await response.json()
      if (data && typeof data === 'object' && 'theme' in data && isStorefrontTheme(data.theme)) {
        setTheme(data.theme)
      }
    } catch {
      // Problemas transitorios de red no deben afectar pedidos ni navegación.
    }
  }, [])

  useEffect(() => {
    void refreshTheme()
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshTheme() }
    const onFocus = () => { void refreshTheme() }
    const onPublished = () => { void refreshTheme() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    window.addEventListener('soff-theme-published', onPublished)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshTheme()
    }, POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('soff-theme-published', onPublished)
    }
  }, [refreshTheme])

  useEffect(() => {
    document.documentElement.dataset.soffTheme = theme
  }, [theme])

  const value = useMemo(() => ({ theme, refreshTheme }), [theme, refreshTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useStorefrontTheme() { return useContext(ThemeContext) }
