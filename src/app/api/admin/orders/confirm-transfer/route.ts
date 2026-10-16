import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 503 })
  }
  const authorization = request.headers.get('authorization') || ''
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
  if (!token) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 })
  const authClient = createClient(url, anonKey, { auth: {persistSession:false,autoRefreshToken:false} })
  const { data: {user}, error } = await authClient.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Sesión inválida.' }, {status:401})

  const db = createClient(url, serviceKey, { auth: {persistSession:false,autoRefreshToken:false} })
  const { data: role, error: roleError } = await db.from('profiles').select('role').eq('id',user.id).maybeSingle()
  if (roleError || role?.role !== 'admin') return NextResponse.json({error:'Acceso no autorizado.'},{status:403})

  let body: unknown
  try { body=await request.json() } catch {return NextResponse.json({error:'Solicitud inválida.'},{status:400})}
  if (!body || typeof body!=='object' || Array.isArray(body)) return NextResponse.json({error:'Datos inválidos.'},{status:400})
  const x=body as Record<string,unknown>
  if (typeof x.orderId!=='string' || !/^[a-f0-9]{8}-[a-f0-9-]{27,36}$/i.test(x.orderId) ||
      typeof x.bankReference!=='string' || !/^[A-Za-z0-9._/-]{6,100}$/.test(x.bankReference.trim()) ||
      typeof x.verifiedAmount!=='number' || !Number.isFinite(x.verifiedAmount) || x.verifiedAmount<=0 ||
      x.bankStatementChecked!==true ||
      (x.note!==undefined && (typeof x.note!=='string' || x.note.length>500))) {
    return NextResponse.json({error:'Completá la referencia, el importe y la confirmación de acreditación bancaria.'},{status:400})
  }
  // Evitar registrar una transferencia basándose únicamente en el OCR/comprobante subido.
  const { data, error: rpcError } = await db.rpc('soff_confirm_transfer_payment',{
    p_order_id:x.orderId, p_bank_reference:x.bankReference.trim().toUpperCase(),
    p_verified_amount:x.verifiedAmount,p_admin_id:user.id,
    p_bank_statement_checked:true,p_note:x.note||''
  })
  if (rpcError) {
    console.error('P005 confirm-transfer RPC:', rpcError.code)
    const missing = rpcError.code==='PGRST202' || rpcError.code==='42883'
    return NextResponse.json({error:missing?'Falta instalar la migración P005 en Supabase.':'No pudo conciliarse el pago. Revisá importe, estado y referencia; si persiste, contactá al administrador.'},{status:missing?503:409})
  }
  return NextResponse.json({success:true,orderId:data?.order_id,replayed:data?.replayed===true})
}
