import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { noStoreHeaders, serverError } from '@/lib/serverCommercial'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(req:NextRequest){
 const auth=await requireSoffAdmin(req);if(auth.error)return auth.error
 const body=await req.json().catch(()=>null) as {threshold?:unknown}|null
 const value=body?.threshold
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1_000_000_000||
 Math.abs(value*100-Math.round(value*100))>0.00001)return serverError('El umbral general debe ser mayor a cero y válido.',400)
 const {error}=await auth.db.from('store_settings').upsert({key:'free_shipping_threshold',value:String(value),updated_at:new Date().toISOString()})
 if(error)return serverError('No se pudo guardar el umbral general. Revisá permisos de Supabase.',503)
 return NextResponse.json({ok:true,threshold:value},{headers:noStoreHeaders})
}
