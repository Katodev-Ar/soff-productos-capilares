import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { noStoreHeaders, explainCommercialError, serverError } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Página de control, con límite para evitar respuestas indefinidas en tiendas grandes. */
async function readPages<T>(query: (start: number, end: number) => PromiseLike<{data:T[] | null;error:{code?:string}|null}>) {
  const records: T[] = []
  for (let page = 0; page < 20; page++) {
    const { data, error } = await query(page * 500, page * 500 + 499)
    if (error) return { error }
    records.push(...(data ?? []))
    if ((data ?? []).length < 500) return { data: records }
  }
  return { error: { code: 'LIMIT' } }
}

export async function GET(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if (auth.error) return auth.error
  const [products, costs, users, requests] = await Promise.all([
    readPages((start, end) => auth.db.from('products')
      .select('id,name,internal_code,stock,price_minorista,price_mayorista,price_revendedor,price_peluquero')
      .order('id').range(start, end)),
    readPages((start, end) => auth.db.from('soff_product_costs')
      .select('product_id,unit_cost').order('product_id').range(start, end)),
    readPages((start, end) => auth.db.from('profiles')
      .select('id,first_name,last_name,email,role,phone,created_at').order('created_at', { ascending: false }).range(start, end)),
    readPages((start, end) => auth.db.from('soff_commercial_requests')
      .select('id,user_id,requested_role,details,status,created_at,reviewed_at,review_note')
      .order('created_at', { ascending: false }).range(start, end)),
  ])
  if (products.error || costs.error || users.error || requests.error) {
    const code = products.error?.code ?? costs.error?.code ?? users.error?.code ?? requests.error?.code
    return serverError(code === 'LIMIT' ? 'Se alcanzó el límite del panel. Requiere paginación avanzada.' : explainCommercialError(code), 503)
  }
  return NextResponse.json({ products: products.data, costs: costs.data, users: users.data, requests: requests.data }, { headers: noStoreHeaders })
}
