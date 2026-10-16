import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyMercadoPagoWebhook } from '@/lib/mercadopagoWebhook'

export const runtime='nodejs'
export async function POST(request:NextRequest) {
  // El alta de MP sigue deshabilitada. Solo recibe y audita eventos si el dueño lo activa.
  if (process.env.SOFF_ENABLE_MP_WEBHOOK !== 'true') return NextResponse.json({error:'MP webhook deshabilitado.'},{status:503})
  const secret=process.env.MERCADOPAGO_WEBHOOK_SECRET
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !token || !url || !dbKey) return NextResponse.json({error:'Webhook sin configurar.'},{status:503})
  const paymentId=request.nextUrl.searchParams.get('data.id') || ''
  const requestId=request.headers.get('x-request-id')
  if (!verifyMercadoPagoWebhook(paymentId,request.headers.get('x-signature'),requestId,secret)) {
    return NextResponse.json({error:'Firma inválida.'},{status:401})
  }
  const topic=request.nextUrl.searchParams.get('type') || request.nextUrl.searchParams.get('topic') || ''
  if (topic !== 'payment' || !/^\d{1,25}$/.test(paymentId)) return NextResponse.json({ignored:true})
  // No se confía en el contenido del webhook; se consulta el recurso a MP por TLS.
  let payment:Record<string,unknown>
  try {
    const res=await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`,{
      headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(8000)
    })
    if (!res.ok) return NextResponse.json({error:'No se pudo validar en Mercado Pago.'},{status:503})
    payment=await res.json()
  } catch {return NextResponse.json({error:'Error consultando a Mercado Pago.'},{status:503})}
  if (String(payment.id)!==paymentId) return NextResponse.json({error:'Pago inconsistente.'},{status:409})
  const db=createClient(url,dbKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const {error}=await db.rpc('soff_log_mp_payment',{
    p_payment_id:paymentId,p_status:String(payment.status||'unknown'),
    p_reference:String(payment.external_reference||''),
    p_amount:typeof payment.transaction_amount==='number'?payment.transaction_amount:null,
    p_currency:String(payment.currency_id||'')
  })
  if (error) {console.error('P005 MP log:',error.code);return NextResponse.json({error:'No se pudo registrar notificación.'},{status:503})}
  return NextResponse.json({received:true})
}
