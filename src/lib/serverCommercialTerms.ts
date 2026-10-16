/** Carga protegida de políticas P017. Si falta SQL o hay datos corruptos, no autorizar compra. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/catalog'
import { type CommercialTerms, type CustomerChannel, type ShippingMode } from '@/lib/commercialPricingPolicy'

type TermRow = {
 channel: CustomerChannel; minimum_order: number | string;
 first_threshold: number | string | null; first_discount: number | string;
 second_threshold: number | string | null; second_discount: number | string;
 allow_coupons: boolean; free_shipping_mode: ShippingMode;
 free_shipping_threshold: number | string | null; updated_at: string;
}
const money = (x: unknown) => typeof x === 'number' || typeof x === 'string' ? Number(x) : NaN
const goodMoney = (x: unknown) => Number.isFinite(money(x)) && money(x) >= 0 && money(x) <= 1_000_000_000

export class CommercialTermsUnavailable extends Error {
 constructor(){super('Las condiciones comerciales no están disponibles. Verificá la migración P017 o consultá con SOFF.')}
}
export async function loadCommercialTerms(db: SupabaseClient, channel: CustomerChannel): Promise<CommercialTerms> {
 const { data, error } = await db.from('soff_channel_terms').select(
   'channel,minimum_order,first_threshold,first_discount,second_threshold,second_discount,allow_coupons,free_shipping_mode,free_shipping_threshold,updated_at'
 ).eq('channel',channel).maybeSingle()
 if (error || !data) throw new CommercialTermsUnavailable()
 const row = data as TermRow
 const first = row.first_threshold === null ? null : money(row.first_threshold)
 const second = row.second_threshold === null ? null : money(row.second_threshold)
 const mode = row.free_shipping_mode
 if (!goodMoney(row.minimum_order) || !Number.isFinite(money(row.first_discount)) || !Number.isFinite(money(row.second_discount)) ||
     money(row.first_discount)<0 || money(row.second_discount)<0 || money(row.first_discount)>80 || money(row.second_discount)>80 ||
     (first !== null && (!goodMoney(first) || first<=0)) || (second !== null && (!goodMoney(second) || second<=0)) ||
     (first === null && (second !== null || money(row.first_discount)!==0)) ||
     (second === null && money(row.second_discount)!==0) ||
     (second !== null && first !== null && (second<=first || money(row.second_discount)<money(row.first_discount))) ||
     !['inherit','disabled','threshold','always'].includes(mode) || typeof row.allow_coupons !== 'boolean') {
   throw new CommercialTermsUnavailable()
 }
 let free: number | null = null
 if (mode === 'threshold') {
   if (!goodMoney(row.free_shipping_threshold) || money(row.free_shipping_threshold)<=0) throw new CommercialTermsUnavailable()
   free = money(row.free_shipping_threshold)
 } else if (mode === 'inherit') {
   const { data: s, error: se } = await db.from('store_settings')
     .select('value').eq('key','free_shipping_threshold').maybeSingle()
   if (se) throw new CommercialTermsUnavailable()
   const configured = s?.value ? Number(s.value) : NaN
   free = Number.isFinite(configured) && configured > 0 && configured <= 1_000_000_000
     ? configured : FREE_SHIPPING_THRESHOLD
 }
 return {
   channel, minimumOrder:money(row.minimum_order),firstThreshold:first,firstDiscount:money(row.first_discount),
   secondThreshold:second,secondDiscount:money(row.second_discount),allowCoupons:row.allow_coupons,
   shippingMode:mode,freeShippingThreshold:free,version:`${row.updated_at}|${free ?? 'none'}`,
 }
}
