import { NextRequest, NextResponse } from 'next/server'
import { requireSoffCustomer, noStoreHeaders, serverError, requireShortJson, explainCommercialError } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const allowed = new Set(['mayorista', 'revendedor', 'peluquero'])

export async function GET(req: NextRequest) {
  const auth = await requireSoffCustomer(req)
  if (auth.error) return auth.error
  const [profile, requests] = await Promise.all([
    auth.db.from('profiles').select('role').eq('id', auth.userId).maybeSingle(),
    auth.db.from('soff_commercial_requests')
      .select('id,requested_role,details,status,created_at,reviewed_at,review_note')
      .eq('user_id', auth.userId).order('created_at', { ascending: false }).limit(20),
  ])
  if (profile.error || !profile.data) return serverError('No se pudo verificar el perfil.', 403)
  if (requests.error) return serverError(explainCommercialError(requests.error.code), 503)
  return NextResponse.json({ role: profile.data.role, requests: requests.data ?? [] }, { headers: noStoreHeaders })
}

export async function POST(req: NextRequest) {
  const auth = await requireSoffCustomer(req)
  if (auth.error) return auth.error
  if (Number(req.headers.get('content-length') ?? 0) > 1500) return serverError('Solicitud demasiado grande.', 413)
  const body: unknown = await req.json().catch(() => null)
  if (!requireShortJson(body) || !allowed.has(String(body.requested_role)) ||
      typeof body.details !== 'string' || body.details.trim().length > 500) {
    return serverError('Elegí un tipo de cuenta válido y escribí un detalle de hasta 500 caracteres.', 400)
  }
  const { error } = await auth.db.rpc('soff_commercial_submit', {
    p_user_id: auth.userId, p_requested_role: body.requested_role, p_details: body.details.trim(),
  })
  if (error) {
    if (error.code === 'P0001' || error.code === '23505') return serverError(
      error.code === '23505' ? 'Ya existe una solicitud pendiente.' : error.message, 409)
    return serverError(explainCommercialError(error.code), 503)
  }
  return NextResponse.json({ success: true, message: 'Solicitud enviada para revisión por SOFF.' }, { headers: noStoreHeaders })
}
