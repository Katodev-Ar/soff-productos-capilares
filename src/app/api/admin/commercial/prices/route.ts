import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { noStoreHeaders, serverError, requireShortJson, explainCommercialError } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fields = ['minorista', 'mayorista', 'revendedor', 'peluquero'] as const
function readMoney(value: unknown, mayBeNull: boolean) {
  if (mayBeNull && value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000000 ||
      Math.abs(Math.round(value * 100) - value * 100) > 0.00001) throw new Error('Importe inválido (máximo 2 decimales).')
  return Math.round(value * 100) / 100
}
export async function POST(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if (auth.error) return auth.error
  if (Number(req.headers.get('content-length') ?? 0) > 1500) return serverError('Solicitud demasiado grande.', 413)
  const body: unknown = await req.json().catch(() => null)
  if (!requireShortJson(body) || typeof body.product_id !== 'string' || !uuid.test(body.product_id)) {
    return serverError('Producto inválido.', 400)
  }
  let values: Record<string, number | null> = {}
  try {
    for (const key of fields) values[key] = readMoney(body[key], false)
    if (values.minorista === 0) throw new Error('El precio minorista debe ser mayor a cero.')
    values.cost = readMoney(body.cost, true)
  } catch (cause) {
    return serverError(cause instanceof Error ? cause.message : 'Importe inválido.', 400)
  }
  const { error } = await auth.db.rpc('soff_commercial_save_prices', {
    p_actor_id: auth.userId, p_product_id: body.product_id, p_minorista: values.minorista,
    p_mayorista: values.mayorista, p_revendedor: values.revendedor,
    p_peluquero: values.peluquero, p_cost: values.cost,
  })
  if (error) return serverError(error.code === 'P0001' ? error.message : explainCommercialError(error.code), error.code === 'P0001' ? 409 : 503)
  return NextResponse.json({ success: true }, { headers: noStoreHeaders })
}
