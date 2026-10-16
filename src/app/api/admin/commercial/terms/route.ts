import { NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { type ShippingMode } from '@/lib/commercialPricingPolicy'
import { noStoreHeaders, serverError, isCommercialRole } from '@/lib/serverCommercial'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const fields = 'channel,minimum_order,first_threshold,first_discount,second_threshold,second_discount,allow_coupons,free_shipping_mode,free_shipping_threshold,updated_at'
const modes: ShippingMode[] = ['inherit','disabled','threshold','always']
const validAmount = (n: unknown, positive=false): n is number => typeof n === 'number' &&
 Number.isFinite(n) && n >= (positive ? 0.01 : 0) && n <= 1_000_000_000 && Math.abs(n*100-Math.round(n*100))<0.00001
const validDiscount = (n: unknown): n is number => validAmount(n) && n <= 80
export async function GET(req: NextRequest) {
 const a = await requireSoffAdmin(req);if(a.error)return a.error
 const {data,error}=await a.db.from('soff_channel_terms').select(fields).order('channel')
 if(error || !data || data.length!==4)return serverError('No se pudieron cargar las reglas. Revisá la migración P017.',503)
 return NextResponse.json({terms:data},{headers:noStoreHeaders})
}
export async function POST(req: NextRequest) {
 const a=await requireSoffAdmin(req);if(a.error)return a.error
 if(Number(req.headers.get('content-length')||0)>3000)return serverError('Solicitud demasiado extensa.',413)
 const b:unknown=await req.json().catch(()=>null)
 if(!b || typeof b!=='object' || Array.isArray(b))return serverError('Datos inválidos.',400)
 const v=b as Record<string,unknown>
 if(!isCommercialRole(v.channel) || !validAmount(v.minimumOrder) ||
  (v.firstThreshold!==null && !validAmount(v.firstThreshold,true)) ||
  (v.secondThreshold!==null && !validAmount(v.secondThreshold,true)) ||
  !validDiscount(v.firstDiscount) || !validDiscount(v.secondDiscount) ||
  (v.firstThreshold===null && (v.secondThreshold!==null || v.firstDiscount!==0)) ||
  (v.secondThreshold===null && v.secondDiscount!==0) ||
  (typeof v.firstThreshold==='number' && typeof v.secondThreshold==='number' &&
    (v.secondThreshold<=v.firstThreshold || v.secondDiscount<v.firstDiscount)) ||
  typeof v.allowCoupons!=='boolean' || typeof v.shippingMode!=='string' ||
  !modes.includes(v.shippingMode as ShippingMode) ||
  (v.shippingMode==='threshold' ? !validAmount(v.shippingThreshold,true) : v.shippingThreshold!==null) ||
  typeof v.reason!=='string' || v.reason.trim().length<8 || v.reason.trim().length>300) {
  return serverError('Revisá importes, umbrales, promociones, envío y motivo del cambio (mínimo 8 caracteres).',400)
 }
 // Precondición de versión evita pisar una edición concurrente del equipo comercial.
 if(typeof v.version!=='string'||!v.version || v.version.length>50)return serverError('Actualizá el panel antes de guardar.',409)
 const updates={minimum_order:v.minimumOrder,first_threshold:v.firstThreshold,first_discount:v.firstDiscount,
  second_threshold:v.secondThreshold,second_discount:v.secondDiscount,allow_coupons:v.allowCoupons,
  free_shipping_mode:v.shippingMode,free_shipping_threshold:v.shippingThreshold,
  change_reason:v.reason.trim(),updated_by:a.userId,updated_at:new Date().toISOString()}
 const {data,error}=await a.db.from('soff_channel_terms').update(updates).eq('channel',v.channel)
   .eq('updated_at',v.version).select('channel,updated_at').maybeSingle()
 if(error) return serverError('No se pudo guardar. Revisá que P017 esté instalado en Supabase.',503)
 if(!data)return serverError('Las reglas cambiaron en otra sesión. Actualizá el panel antes de guardar.',409)
 return NextResponse.json({ok:true,channel:data.channel,version:data.updated_at},{headers:noStoreHeaders})
}
