'use client'
import ProductCardPremium from './ProductCardPremium'
import type { Product, UserRole } from '@/lib/catalog'
type Props = { product: Product; userRole: UserRole; showCode?: boolean }
export default function ProductCardAurora(props: Props) {
  return <div className="soff-aurora-card h-full"><ProductCardPremium {...props} /></div>
}
