'use client'
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider'
import ProductCardClassic from '@/components/storefront/ProductCardClassic'
import ProductCardPremium from '@/components/storefront/ProductCardPremium'
import ProductCardPerla from '@/components/storefront/ProductCardPerla'
import ProductCardAurora from '@/components/storefront/ProductCardAurora'
import ProductCardSalvia from '@/components/storefront/ProductCardSalvia'
import ProductCardMalva from '@/components/storefront/ProductCardMalva'
import type { Product, UserRole } from '@/lib/catalog'
type Props = { product: Product; userRole: UserRole; showCode?: boolean }
export default function ProductCard(props: Props) {
  const { theme } = useStorefrontTheme()
  switch (theme) {
    case 'premium': return <ProductCardPremium {...props} />
    case 'perla': return <ProductCardPerla {...props} />
    case 'salvia': return <ProductCardSalvia {...props} />
    case 'malva': return <ProductCardMalva {...props} />
    case 'aurora': return <ProductCardAurora {...props} />
    default: return <ProductCardClassic {...props} />
  }
}
