import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { isCommercialRole, noStoreHeaders, serverError, requireShortJson, explainCommercialError } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function POST(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if (auth.error) return auth.error
  if (Number(req.headers.get('content-length') ?? 0) > 1500) return serverError('Solicitud demasiado grande.', 413)
  const body: unknown = await req.json().catch(() => null)
  if (!requireShortJson(body) || typeof body.user_id !== 'string' || !uuid.test(body.user_id) ||
      !isCommercialRole(body.role) || typeof body.note !== 'string' ||
      body.note.trim().length < 8 || body.note.length > 500) {
    return serverError('Elegí una categoría y explicá el motivo (8 a 500 caracteres).', 400)
  }
  const { error } = await auth.db.rpc('soff_commercial_assign', {
    p_actor_id: auth.userId, p_user_id: body.user_id, p_role: body.role, p_note: body.note.trim(),
  })
  if (error) return serverError(error.code === 'P0001' ? error.message : explainCommercialError(error.code), error.code === 'P0001' ? 409 : 503)
  return NextResponse.json({ success: true }, { headers: noStoreHeaders })
}
