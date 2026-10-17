'use client'

import HomeClassic from '@/components/storefront/HomeClassic'
import HomePremium from '@/components/storefront/HomePremium'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'

export default function Home() {
  const { theme } = useStorefrontTheme()
  return theme === 'premium' ? <HomePremium /> : <HomeClassic />
}
