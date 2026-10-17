'use client'

import HeaderClassic from '@/components/storefront/HeaderClassic'
import HeaderPremium from '@/components/storefront/HeaderPremium'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'

export default function Header() {
  const { theme } = useStorefrontTheme()
  return theme === 'premium' ? <HeaderPremium /> : <HeaderClassic />
}
