'use client'
import HeaderClassic from '@/components/storefront/HeaderClassic'
import HeaderPremium from '@/components/storefront/HeaderPremium'
import HeaderPerla from '@/components/storefront/HeaderPerla'
import HeaderAurora from '@/components/storefront/HeaderAurora'
import HeaderSalvia from '@/components/storefront/HeaderSalvia'
import HeaderMalva from '@/components/storefront/HeaderMalva'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
export default function Header() {
  const { theme } = useStorefrontTheme()
  switch (theme) {
    case 'premium': return <HeaderPremium />
    case 'perla': return <HeaderPerla />
    case 'salvia': return <HeaderSalvia />
    case 'malva': return <HeaderMalva />
    case 'aurora': return <HeaderAurora />
    default: return <HeaderClassic />
  }
}
