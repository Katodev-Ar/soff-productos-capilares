'use client'

import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
import ProductCardClassic from '@/components/storefront/ProductCardClassic'
import ProductCardPremium from '@/components/storefront/ProductCardPremium'
import type { Product, UserRole } from '@/lib/catalog'

type Props = { product: Product; userRole: UserRole; showCode?: boolean }

export default function ProductCard(props: Props) {
  const { theme } = useStorefrontTheme()
  return theme === 'premium' ? <ProductCardPremium {...props} /> : <ProductCardClassic {...props} />
}
