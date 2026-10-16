import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { noStoreHeaders, serverError, requireShortJson, explainCommercialError } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function POST(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if (auth.error) return auth.error
  if (Number(req.headers.get('content-length') ?? 0) > 1500) return serverError('Solicitud demasiado grande.', 413)
  const body: unknown = await req.json().catch(() => null)
  if (!requireShortJson(body) || typeof body.request_id !== 'string' || !uuid.test(body.request_id) ||
    typeof body.approve !== 'boolean' || typeof body.note !== 'string' || body.note.length > 500) {
    return serverError('Decisión inválida.', 400)
  }
  const { error } = await auth.db.rpc('soff_commercial_decide', {
    p_actor_id: auth.userId, p_request_id: body.request_id,
    p_approve: body.approve, p_note: body.note.trim(),
  })
  if (error) return serverError(error.code === 'P0001' ? error.message : explainCommercialError(error.code), error.code === 'P0001' ? 409 : 503)
  return NextResponse.json({ success: true }, { headers: noStoreHeaders })
}
