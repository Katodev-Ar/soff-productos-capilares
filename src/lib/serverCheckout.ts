/**
 * P003 — cotización del pedido exclusivamente del lado servidor.
 * Nunca confiar en total, rol, precios, descuentos ni stock recibidos del cliente.
 * Este módulo NO reserva stock: el descuento transaccional queda en P004.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRolePrice, getAvailableStock, normalizeRole, PRODUCT_SELECT, type Product } from '@/lib/catalog'
import { estimateShippingCost, SHIPPING_RATES, type DeliveryMethod } from '@/lib/shipping'
import { couponAllowedFor, volumeDiscountFor, channelOf, minimumRemaining, hasFreeShipping } from '@/lib/commercialPricingPolicy'
import { loadCommercialTerms, CommercialTermsUnavailable } from '@/lib/serverCommercialTerms'

export class CheckoutValidationError extends Error {
  constructor(message: string, public readonly status = 400) { super(message) }
}

export type ValidItem = { id: string; quantity: number }
type Coords = { lat: number; lng: number } | null
export type ValidatedCoupon = { id: string; currentUses: number }
export type Quote = {
  items: Array<ValidItem & { price: number; title: string }>
  subtotal: number
  discountPercentage: number
  shipping: number
  total: number
  coupon: ValidatedCoupon | null
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const allowedMethods = new Set<DeliveryMethod>(['delivery', 'pickup', 'uber_moto', 'whatsapp'])

export function parseItems(value: unknown): ValidItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new CheckoutValidationError('El pedido debe incluir entre 1 y 50 productos.')
  }
  const seen = new Set<string>()
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new CheckoutValidationError('Producto inválido.')
    const data = item as Record<string, unknown>
    if (typeof data.id !== 'string' || !UUID.test(data.id) ||
        typeof data.quantity !== 'number' || !Number.isInteger(data.quantity) ||
        data.quantity < 1 || data.quantity > 1000 || seen.has(data.id)) {
      throw new CheckoutValidationError('El carrito tiene identificadores duplicados o cantidades inválidas.')
    }
    seen.add(data.id)
    return { id: data.id, quantity: data.quantity }
  })
}

export function parseCoordinates(lat: unknown, lng: unknown): Coords {
  if (lat === null && lng === null) return null
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new CheckoutValidationError('Coordenadas del envío inválidas.')
  }
  return { lat, lng }
}

export async function calculateQuote(
  supabase: SupabaseClient,
  userId: string,
  input: { items: unknown; deliveryMethod: unknown; coordinates: Coords; couponCode: unknown }
): Promise<Quote> {
  const items = parseItems(input.items)
  if (typeof input.deliveryMethod !== 'string' || !allowedMethods.has(input.deliveryMethod as DeliveryMethod)) {
    throw new CheckoutValidationError('Seleccioná un método de entrega válido.')
  }
  const method = input.deliveryMethod as DeliveryMethod
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  if (profileError || !profile) throw new CheckoutValidationError('No se pudo verificar el perfil del comprador.', 403)
  const role = normalizeRole(profile.role)
  let terms
  try {terms = await loadCommercialTerms(supabase,channelOf(role))}
  catch (e) {throw new CheckoutValidationError(e instanceof CommercialTermsUnavailable ? e.message : 'Condiciones comerciales no disponibles.',503)}

  const { data: productRows, error: productError } = await supabase
    .from('products').select(PRODUCT_SELECT).in('id', items.map(i => i.id)).returns<Product[]>()
  if (productError || !productRows || productRows.length !== items.length) {
    throw new CheckoutValidationError('Uno o más productos ya no están disponibles.', 409)
  }
  const products = new Map(productRows.map(p => [p.id, p]))
  let subtotal = 0
  const validatedItems = items.map(item => {
    const product = products.get(item.id)
    if (!product) throw new CheckoutValidationError('Producto no disponible.', 409)
    if (getAvailableStock(product) < item.quantity) {
      throw new CheckoutValidationError(`Stock insuficiente para ${product.name}.`, 409)
    }
    const price = getRolePrice(product, role)
    if (!Number.isFinite(price) || price <= 0 || price > 100000000 || Math.abs(Math.round(price * 100) - price * 100) > 0.000001) {
      throw new CheckoutValidationError(`Precio no válido para ${product.name}.`, 409)
    }
    subtotal += price * item.quantity
    return { ...item, price, title: product.name }
  })
  subtotal = Math.round(subtotal * 100) / 100
  if (minimumRemaining(subtotal,terms) > 0) {
    throw new CheckoutValidationError(`Compra mínima para ${terms.channel}: $${terms.minimumOrder.toLocaleString('es-AR')}.`,409)
  }
  const volumeDiscount = volumeDiscountFor(subtotal, role, terms)

  let coupon: ValidatedCoupon | null = null
  let couponDiscount = 0
  if (input.couponCode != null && input.couponCode !== '') {
    if (!couponAllowedFor(role,terms)) {
      throw new CheckoutValidationError('Los cupones minoristas no se acumulan con precios comerciales.', 409)
    }
    if (typeof input.couponCode !== 'string' || !/^[A-Z0-9_-]{1,40}$/.test(input.couponCode)) {
      throw new CheckoutValidationError('Cupón inválido.')
    }
    const { data: found, error: couponError } = await supabase.from('coupons')
      .select('id,code,discount_percentage,max_uses,current_uses,is_active')
      .eq('code', input.couponCode).eq('is_active', true).maybeSingle()
    if (couponError || !found) throw new CheckoutValidationError('El cupón ya no está disponible.', 409)
    const maximum = found.max_uses
    if (maximum != null && Number(found.current_uses) >= Number(maximum)) {
      throw new CheckoutValidationError('Se agotaron los usos del cupón.', 409)
    }
    couponDiscount = Number(found.discount_percentage)
    if (!Number.isFinite(couponDiscount) || couponDiscount <= 0 || couponDiscount > 100) {
      throw new CheckoutValidationError('Descuento del cupón inválido.', 409)
    }
    coupon = { id: String(found.id), currentUses: Number(found.current_uses) }
  }
  const discountPercentage = Math.min(100, volumeDiscount + couponDiscount)
  const discounted = Math.round(subtotal * (1 - discountPercentage / 100) * 100) / 100
  let shipping = 0
  if (method === 'delivery') {
    const isFree = hasFreeShipping(discounted,terms)
    shipping = isFree ? 0 : input.coordinates
      ? estimateShippingCost(input.coordinates.lat, input.coordinates.lng).totalShipping
      : SHIPPING_RATES.DEFAULT_FLAT_RATE
    if (!Number.isFinite(shipping) || shipping < 0 || shipping > 1000000) {
      throw new CheckoutValidationError('No se pudo cotizar el envío.', 409)
    }
  }
  const total = Math.round((discounted + shipping) * 100) / 100
  if (!Number.isFinite(total) || total <= 0 || total > 1000000000) {
    throw new CheckoutValidationError('Total no válido.', 409)
  }
  return { items: validatedItems, subtotal, discountPercentage, shipping, total, coupon }
}
