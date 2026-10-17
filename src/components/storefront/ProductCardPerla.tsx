'use client'
import ProductCardClassic from './ProductCardClassic'
import type { Product, UserRole } from '@/lib/catalog'
type Props = { product: Product; userRole: UserRole; showCode?: boolean }
export default function ProductCardPerla(props: Props) {
  return <div className="soff-perla-card h-full"><ProductCardClassic {...props} /></div>
}
