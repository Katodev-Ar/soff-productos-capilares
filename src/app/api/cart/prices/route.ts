import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRolePrice, normalizeRole, type Product } from '@/lib/catalog'
import { channelOf } from '@/lib/commercialPricingPolicy'
import { loadCommercialTerms, CommercialTermsUnavailable } from '@/lib/serverCommercialTerms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers })

/** Consulta los precios autorizados sin exponer otras listas ni confiar en datos de localStorage. */
export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 3000) return failure('Solicitud demasiado grande.', 413)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return failure('Catálogo no configurado.', 503)

  const payload: unknown = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return failure('Solicitud inválida.', 400)
  const ids = (payload as Record<string, unknown>).ids
  if (!Array.isArray(ids) || ids.length > 50 || ids.some(id => typeof id !== 'string' || !uuid.test(id)) ||
      new Set(ids).size !== ids.length) return failure('Identificadores inválidos o duplicados.', 400)

  const authHeader = request.headers.get('authorization') || ''
  const bearer = /^Bearer\s+(\S+)$/i.exec(authHeader)
  if (authHeader && !bearer) return failure('Autenticación inválida.', 401)
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  let role = 'minorista'
  if (bearer) {
    const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error } = await authClient.auth.getUser(bearer[1])
    if (error || !user) return failure('Sesión vencida. Volvé a iniciar sesión.', 401)
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).single()
    if (profileError || !profile) return failure('No se pudo verificar la categoría del cliente.', 403)
    role = normalizeRole(profile.role)
  }

  // La política debe estar instalada para cotizar, incluso con carrito vacío.
  let terms
  try {terms = await loadCommercialTerms(db,channelOf(role))}
  catch (e) {return failure(e instanceof CommercialTermsUnavailable ? e.message : 'No se pudo consultar la política comercial.',503)}
  if (!ids.length) return NextResponse.json({ role: channelOf(role), terms, items: [] }, { headers })
  const { data: products, error: productsError } = await db.from('products')
    .select('id,name,image_url,stock,price_minorista,price_mayorista,price_revendedor,price_peluquero')
    .in('id', ids).returns<Product[]>()
  if (productsError || !products || products.length !== ids.length) return failure('Un producto del carrito ya no existe. Quitalo para continuar.', 409)
  const byId = new Map(products.map(p => [p.id, p]))
  const items = []
  for (const id of ids as string[]) {
    const p = byId.get(id)
    if (!p) return failure('No se encontró uno de los productos.', 409)
    const price = getRolePrice(p, role)
    const stock = Number(p.stock)
    if (!Number.isFinite(price) || price <= 0 || price > 100000000 ||
        Math.abs(Math.round(price * 100) - price * 100) > 0.00001) {
      return failure(`El artículo «${p.name}» no tiene un precio válido para tu categoría. Quitalo del carrito.`, 409)
    }
    if (!Number.isFinite(stock) || stock < 1) {
      return failure(`«${p.name}» no tiene stock disponible. Quitalo del carrito.`, 409)
    }
    items.push({ id, name: p.name, price, image_url: p.image_url, stock: Math.trunc(stock) })
  }
  return NextResponse.json({ role: channelOf(role), terms, items }, { headers })
}
