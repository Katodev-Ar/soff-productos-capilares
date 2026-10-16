import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return NextResponse.json({error:'Servicio no configurado.'},{status:503,headers})
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '')?.[1]
  if (!token) return NextResponse.json({error:'Iniciá sesión para usar un cupón.'},{status:401,headers})
  const authClient = createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:{user},error:authError} = await authClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({error:'Sesión inválida.'},{status:401,headers})
  const payload = await request.json().catch(() => null)
  const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) return NextResponse.json({error:'Cupón inválido.'},{status:400,headers})
  const db = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error} = await db.from('coupons')
    .select('discount_percentage,max_uses,current_uses,is_active')
    .eq('code',code).eq('is_active',true).maybeSingle()
  if(error) return NextResponse.json({error:'No se pudo consultar el cupón.'},{status:503,headers})
  const valid = data && (data.max_uses == null || Number(data.current_uses) < Number(data.max_uses))
    && Number.isFinite(Number(data.discount_percentage))
    && Number(data.discount_percentage) > 0 && Number(data.discount_percentage) <= 80
  if(!valid) return NextResponse.json({error:'Cupón inválido o agotado.'},{status:404,headers})
  // El descuento definitivo vuelve a validarse en el checkout transaccional.
  return NextResponse.json({code,discountPercentage:Number(data.discount_percentage)},{headers})
}
