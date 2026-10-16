import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const privateResponse = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } })

// Nunca aceptar un nombre de archivo directamente del navegador: solo el ID del pedido.
function receiptPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.startsWith('receipts/')) return value.slice('receipts/'.length)
  // Referencias anteriores P001: URL publica /storage/v1/object/public/receipts/...
  try {
    const parsed = new URL(value)
    const match = parsed.pathname.match(/\/storage\/v1\/object\/public\/receipts\/(.+)$/)
    if (match) return decodeURIComponent(match[1])
  } catch { /* not an URL */ }
  return null
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  if (!UUID_RE.test(orderId)) return privateResponse({ error: 'Pedido no válido.' }, 400)
  const authHeader = request.headers.get('authorization') || ''
  if (!/^Bearer\s+[^\s]+$/i.test(authHeader)) return privateResponse({ error: 'Iniciá sesión.' }, 401)
  const token = authHeader.replace(/^Bearer\s+/i, '')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return privateResponse({ error: 'Servicio no disponible.' }, 503)

  try {
    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: userError } = await authClient.auth.getUser(token)
    if (userError || !user) return privateResponse({ error: 'Sesión inválida.' }, 401)

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: order, error: orderError } = await adminClient.from('orders')
      .select('user_id, mp_payment_id').eq('id', orderId).maybeSingle()
    if (orderError || !order) return privateResponse({ error: 'No se encontró el comprobante.' }, 404)

    const isOwner = order.user_id === user.id
    const { data: profile, error: roleError } = await adminClient.from('profiles')
      .select('role').eq('id', user.id).maybeSingle()
    if (roleError) return privateResponse({ error: 'No se pudieron comprobar permisos.' }, 503)
    const isAdmin = profile?.role === 'admin'
    if (!isOwner && !isAdmin) return privateResponse({ error: 'Sin autorización.' }, 403)

    const path = receiptPath(order.mp_payment_id)
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => part === '..' || part === '.')) {
      return privateResponse({ error: 'Este pedido no tiene un comprobante privado válido.' }, 404)
    }
    // Los recibos anteriores guardados en la raíz carecen de propietario verificable.
    // Por seguridad, esos archivos solo pueden verlos administradores.
    if (!isAdmin && !path.startsWith(`${user.id}/`)) {
      return privateResponse({ error: 'Este comprobante anterior solo puede consultarlo administración.' }, 403)
    }

    const { data, error } = await adminClient.storage.from('receipts').createSignedUrl(path, 60)
    if (error || !data?.signedUrl) return privateResponse({ error: 'No se pudo abrir el comprobante.' }, 404)
    return privateResponse({ url: data.signedUrl }, 200)
  } catch (error) {
    console.error('Receipt access error:', error)
    return privateResponse({ error: 'Error al consultar el comprobante.' }, 500)
  }
}
