import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  PRODUCT_SELECT,
  getAvailableStock,
  getRolePrice,
  normalizeRole,
  type Product,
  type UserRole,
} from '@/lib/catalog'

type CheckoutItem = {
  id: string
  quantity: number
}

type CheckoutBody = {
  items?: unknown
  userRole?: string
}

type MercadoPagoPreference = {
  init_point?: string
  sandbox_init_point?: string
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Faltan variables de Supabase en el servidor.' }, { status: 500 })
    }

    if (!mpAccessToken) {
      return NextResponse.json({ error: 'Mercado Pago todavía no está configurado.' }, { status: 501 })
    }

    const body = (await request.json()) as CheckoutBody
    const items = normalizeCheckoutItems(body.items)
    const userRole = normalizeRole(body.userRole)

    if (items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const productIds = items.map((item) => item.id)

    const { data: dbProducts, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', productIds)
      .returns<Product[]>()

    if (error || !dbProducts) {
      throw new Error('Error al validar productos')
    }

    const preferenceItems = buildPreferenceItems(items, dbProducts, userRole)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: preferenceItems,
        back_urls: {
          success: `${baseUrl}/checkout/exito`,
          failure: `${baseUrl}/checkout/error`,
          pending: `${baseUrl}/checkout/pendiente`,
        },
        payment_methods: {
          installments: 3,
        },
      }),
    })

    if (!mpResponse.ok) {
      throw new Error('Error al crear preferencia en Mercado Pago')
    }

    const preference = (await mpResponse.json()) as MercadoPagoPreference
    const redirectUrl = preference.sandbox_init_point || preference.init_point

    if (!redirectUrl) {
      throw new Error('Mercado Pago no devolvió una URL de pago')
    }

    return NextResponse.json({ init_point: redirectUrl })
  } catch (error) {
    console.error('Checkout API Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

function normalizeCheckoutItems(input: unknown): CheckoutItem[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const rawItem = item as { id?: unknown; quantity?: unknown }
      const quantity = Number(rawItem.quantity ?? 0)

      if (typeof rawItem.id !== 'string' || !Number.isFinite(quantity) || quantity <= 0) return null

      return {
        id: rawItem.id,
        quantity: Math.trunc(quantity),
      }
    })
    .filter((item): item is CheckoutItem => item !== null)
}

function buildPreferenceItems(items: CheckoutItem[], products: Product[], userRole: UserRole) {
  return items.map((cartItem) => {
    const dbProduct = products.find((product) => product.id === cartItem.id)
    if (!dbProduct) throw new Error(`Producto no encontrado: ${cartItem.id}`)

    const availableStock = getAvailableStock(dbProduct)
    const unitPrice = getRolePrice(dbProduct, userRole)

    if (availableStock <= 0) throw new Error(`Producto sin stock: ${dbProduct.name}`)
    if (unitPrice <= 0) throw new Error(`Producto sin precio configurado: ${dbProduct.name}`)

    return {
      id: dbProduct.id,
      title: dbProduct.name,
      quantity: Math.min(cartItem.quantity, availableStock),
      currency_id: 'ARS',
      unit_price: unitPrice,
      picture_url: dbProduct.image_url || undefined,
      category_id: dbProduct.category || undefined,
    }
  })
}
