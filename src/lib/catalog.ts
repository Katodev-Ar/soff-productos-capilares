export type UserRole = 'admin' | 'minorista' | 'mayorista' | 'peluquero' | 'revendedor'

export type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  stock: number | null
  category: string | null
  barcode: string | null
  internal_code: string | null
  price_base: number | string | null
  price_minorista: number | string | null
  price_mayorista: number | string | null
  price_peluquero: number | string | null
  price_revendedor: number | string | null
  created_at?: string | null
}

export type Combo = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  discount_percentage: number
  is_active: boolean
  created_at?: string | null
  combo_products: { product: Product }[]
}

export type CartItem = {
  id: string
  is_combo?: boolean
  quantity: number
  product?: Product
  combo?: Combo
}

export const PRODUCT_SELECT =
  'id,name,description,image_url,stock,category,barcode,internal_code,price_base,price_minorista,price_mayorista,price_peluquero,price_revendedor,created_at'

export const PRODUCT_CATEGORIES = [
  'SHAMPOO',
  'ACONDICIONADOR',
  'CREMA DE PEINAR',
  'MASCARAS',
  'AMPOLLAS',
  'SERUM',
  'PROTECTOR TERMICO',
  'MATIZADORES',
  'TINTURAS FIDELITE',
  'TINTURAS NOV',
  'TINTURAS IYOSEI',
  'TINTURA SIN AMONIACO FIDELITE',
  'OXIDANTES',
  'POLVOS DECOLORANTES',
  'ALISADO CON FORMOL',
  'ALISADO SIN FORMOL',
  'GEL',
  'CERA',
  'SPRAY FIJADOR',
  'BRILLOS',
  'BARBERIA',
  'CEPILLOS',
  'PEINES',
  'PINCEL PARA TINTURA',
  'BROCHES PELUQUERIA',
  'GORROS PARA MECHAS',
  'GORROS TERMICOS',
  'BOL',
  'QUITAMANCHA',
  'QUITAESMALTE',
  'BIOTINA',
  'SKALA POTE',
  'LABIALES',
  'TALCO',
  'ALGODON',
  'HISOPOS',
  'JABON',
  'ALCOHOL',
  'MAQUINITAS DE AFEITAR',
  'PAPEL HIGENICO',
  'PAÑUELITOS DESCARTABLES',
  'ROLLO DE SERVILLETA',
  'TOALLITAS FEMENINAS',
  'PASTA DENTAL',
  'SIN CATEGORIA',
] as const

export const FREE_SHIPPING_THRESHOLD = 75000

const priceFields: Record<UserRole, keyof Product> = {
  admin: 'price_minorista',
  minorista: 'price_minorista',
  mayorista: 'price_mayorista',
  peluquero: 'price_peluquero',
  revendedor: 'price_revendedor',
}

export function normalizeRole(role: string | null | undefined): UserRole {
  if (
    role === 'admin' ||
    role === 'minorista' ||
    role === 'mayorista' ||
    role === 'peluquero' ||
    role === 'revendedor'
  ) {
    return role
  }

  return 'minorista'
}

export function toNumber(value: number | string | null | undefined): number {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

export function getRolePrice(product: Product, role: UserRole | string): number {
  const normalizedRole = normalizeRole(role)
  return toNumber(product[priceFields[normalizedRole]] as number | string | null | undefined)
}

export function getAvailableStock(product: Pick<Product, 'stock'>): number {
  return Math.max(0, Math.trunc(toNumber(product.stock)))
}

export function hasSellablePrice(product: Product, role: UserRole | string): boolean {
  return getRolePrice(product, role) > 0
}

export function formatPrice(value: number | string | null | undefined): string {
  const amount = toNumber(value)

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function productCategoryHref(category: string | null | undefined): string {
  const cleanCategory = category?.trim()
  return cleanCategory ? `/productos?categoria=${encodeURIComponent(cleanCategory)}` : '/productos'
}
