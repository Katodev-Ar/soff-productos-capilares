/** P017 — reglas por canal. Autoridad de configuración: servidor/Supabase. */
import { normalizeRole, type UserRole } from '@/lib/catalog'
export type CustomerChannel = 'minorista' | 'mayorista' | 'revendedor' | 'peluquero'
export type ShippingMode = 'inherit' | 'disabled' | 'threshold' | 'always'
export type CommercialTerms = {
  channel: CustomerChannel
  minimumOrder: number
  firstThreshold: number | null
  firstDiscount: number
  secondThreshold: number | null
  secondDiscount: number
  allowCoupons: boolean
  shippingMode: ShippingMode
  /** Umbral EFECTIVO de envío gratis cuando corresponde; null = desactivado. */
  freeShippingThreshold: number | null
  /** Token de configuración: cambia cuando el admin modifica la política. */
  version: string
}
export const CHANNEL_LABELS: Record<CustomerChannel, string> = {
  minorista: 'Minorista', mayorista: 'Mayorista',
  revendedor: 'Revendedor', peluquero: 'Peluquero',
}
export function channelOf(role: UserRole | string | null | undefined): CustomerChannel {
  const r = normalizeRole(role)
  return r === 'admin' ? 'minorista' : r
}
/** Política legacy, solo para compatibilidad con código anterior. Las API nunca la usan de fallback. */
export function volumeDiscountFor(subtotal: number, role: UserRole | string, terms?: CommercialTerms | null): number {
  if (!Number.isFinite(subtotal) || subtotal < 0) return 0
  if (terms) {
    if (terms.channel !== channelOf(role)) return 0
    if (terms.secondThreshold !== null && subtotal >= terms.secondThreshold) return terms.secondDiscount
    if (terms.firstThreshold !== null && subtotal >= terms.firstThreshold) return terms.firstDiscount
    return 0
  }
  return channelOf(role) === 'minorista' ? (subtotal >= 70000 ? 10 : subtotal >= 45000 ? 5 : 0) : 0
}
export function couponAllowedFor(role: UserRole | string, terms?: CommercialTerms | null): boolean {
  if (terms) return terms.channel === channelOf(role) && terms.allowCoupons
  return channelOf(role) === 'minorista'
}
export function minimumRemaining(subtotal: number, terms: CommercialTerms): number {
  return Math.max(0, Math.round((terms.minimumOrder - subtotal) * 100) / 100)
}
export function hasFreeShipping(afterDiscount: number, terms: CommercialTerms): boolean {
  return terms.shippingMode === 'always' ||
    (terms.shippingMode !== 'disabled' && terms.freeShippingThreshold !== null &&
      afterDiscount >= terms.freeShippingThreshold)
}
