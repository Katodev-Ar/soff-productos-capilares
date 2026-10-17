'use client'
import HomeClassic from '@/components/storefront/HomeClassic'
import HomePremium from '@/components/storefront/HomePremium'
import HomePerla from '@/components/storefront/HomePerla'
import HomeAurora from '@/components/storefront/HomeAurora'
import HomeSalvia from '@/components/storefront/HomeSalvia'
import HomeMalva from '@/components/storefront/HomeMalva'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
export default function Home() {
  const { theme } = useStorefrontTheme()
  switch (theme) {
    case 'premium': return <HomePremium />
    case 'perla': return <HomePerla />
    case 'salvia': return <HomeSalvia />
    case 'malva': return <HomeMalva />
    case 'aurora': return <HomeAurora />
    default: return <HomeClassic />
  }
}
