'use client'
import { useCallback, useEffect, useState } from 'react'
import { getAsSoffAdmin, postAsSoffAdmin } from '@/lib/adminFetch'
import { CHANNEL_LABELS, type CustomerChannel, type ShippingMode } from '@/lib/commercialPricingPolicy'

type Rule = {channel:CustomerChannel;minimum_order:number|string;first_threshold:number|string|null;first_discount:number|string;second_threshold:number|string|null;second_discount:number|string;allow_coupons:boolean;free_shipping_mode:ShippingMode;free_shipping_threshold:number|string|null;updated_at:string}
type Draft = {minimumOrder:string;firstThreshold:string;firstDiscount:string;secondThreshold:string;secondDiscount:string;allowCoupons:boolean;shippingMode:ShippingMode;shippingThreshold:string;reason:string}
const channels:CustomerChannel[]=['minorista','mayorista','revendedor','peluquero']
const formOf=(r:Rule):Draft=>({minimumOrder:String(r.minimum_order),firstThreshold:r.first_threshold==null?'':String(r.first_threshold),firstDiscount:String(r.first_discount),secondThreshold:r.second_threshold==null?'':String(r.second_threshold),secondDiscount:String(r.second_discount),allowCoupons:r.allow_coupons,shippingMode:r.free_shipping_mode,shippingThreshold:r.free_shipping_threshold==null?'':String(r.free_shipping_threshold),reason:''})
const input='block mt-1 w-full rounded-lg border px-3 py-2 bg-white'
export default function CondicionesComerciales(){
 const [rules,setRules]=useState<Rule[]>([]),[channel,setChannel]=useState<CustomerChannel>('minorista')
 const [drafts,setDrafts]=useState<Partial<Record<CustomerChannel,Draft>>>({})
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const [notice,setNotice]=useState(''),[error,setError]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{const result=await getAsSoffAdmin('/api/admin/commercial/terms')
   if(!Array.isArray(result.terms)||result.terms.length!==4)throw Error('Faltan las cuatro reglas de categoría.')
   const list=result.terms as Rule[];setRules(list)
   setDrafts(Object.fromEntries(list.map(r=>[r.channel,formOf(r)])))
  }catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar las condiciones.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const row=rules.find(r=>r.channel===channel),draft=drafts[channel]
 const change=(key:keyof Draft,value:string|boolean)=>setDrafts(a=>({...a,[channel]:{...a[channel]!,[key]:value}}))
 const money=(key:keyof Draft,label:string,required=false)=> <label className="block text-sm font-medium">{label}
  <input className={input} type="number" step="0.01" min={key==='minimumOrder'||key==='firstDiscount'||key==='secondDiscount'?'0':'0.01'} max="1000000000" required={required}
  value={String(draft?.[key]??'')} onChange={e=>change(key,e.target.value)}/></label>
 async function save(e:React.FormEvent){
  e.preventDefault();if(!row||!draft||busy)return
  const first=draft.firstThreshold.trim()===''?null:Number(draft.firstThreshold)
  const second=draft.secondThreshold.trim()===''?null:Number(draft.secondThreshold)
  const firstDiscount=Number(draft.firstDiscount),secondDiscount=Number(draft.secondDiscount)
  const minimumOrder=Number(draft.minimumOrder)
  const shippingThreshold=draft.shippingMode==='threshold'?Number(draft.shippingThreshold):null
  const valid=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1e9&&Math.abs(n*100-Math.round(n*100))<1e-5
  if(!valid(minimumOrder)||!valid(firstDiscount)||firstDiscount>80||!valid(secondDiscount)||secondDiscount>80||
    (first!==null&&(!valid(first)||first<=0))||(second!==null&&(!valid(second)||second<=0))||
    (first===null&&(firstDiscount!==0||second!==null))||(second===null&&secondDiscount!==0)||
    (first!==null&&second!==null&&(second<=first||secondDiscount<firstDiscount))||
    (draft.shippingMode==='threshold'&&(shippingThreshold===null||!valid(shippingThreshold)||shippingThreshold<=0))){
   setError('Revisá los umbrales, importes y descuentos.');return
  }
  if(draft.reason.trim().length<8){setError('El motivo debe tener al menos ocho caracteres.');return}
  setBusy(true);setError('');setNotice('')
  try{
   await postAsSoffAdmin('/api/admin/commercial/terms',{channel,minimumOrder,firstThreshold:first,firstDiscount,
    secondThreshold:second,secondDiscount,allowCoupons:draft.allowCoupons,shippingMode:draft.shippingMode,
    shippingThreshold,reason:draft.reason.trim(),version:row.updated_at})
   setNotice(`Condiciones de ${CHANNEL_LABELS[channel]} guardadas. No modifica pedidos anteriores.`)
   await load()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.')}finally{setBusy(false)}
 }
 return <main className="max-w-5xl mx-auto p-5 md:p-8 space-y-5 text-slate-900">
  <div><p className="text-sm uppercase tracking-widest text-slate-500">SOFF · P017</p><h1 className="text-3xl font-bold">Condiciones por tipo de cliente</h1>
   <p className="text-slate-600 mt-1">Definí mínimos de compra, promociones y envíos para cada una de las cuatro listas.</p></div>
  <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">Los cambios rigen para nuevas compras; probá primero en una copia de Supabase y Vercel de ensayo. No modifican ventas históricas.</div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-green-50 text-green-800 p-4">{notice}</p>}
  <button className="border rounded-lg bg-white px-3 py-2" type="button" onClick={()=>void load()} disabled={loading||busy}>Actualizar información</button>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{channels.map(ch=><button type="button" key={ch}
    aria-pressed={channel===ch} onClick={()=>{setChannel(ch);setError('');setNotice('')}}
    className={`rounded-xl p-4 border font-semibold ${channel===ch?'bg-black text-white':'bg-white'}`}>{CHANNEL_LABELS[ch]}</button>)}</div>
  {loading&&<p role="status">Cargando condiciones…</p>}
  {!loading&&row&&draft&&<form className="space-y-5" onSubmit={e=>void save(e)}>
   <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-bold">{CHANNEL_LABELS[channel]} · Compra mínima</h2>
    <p className="text-sm text-slate-600">0 significa sin mínimo. Se mide sobre el subtotal de productos, antes de descuentos y sin incluir envío.</p>
    <div className="max-w-sm">{money('minimumOrder','Compra mínima ($)',true)}</div></section>
   <section className="rounded-xl border bg-white p-5 space-y-4"><h2 className="text-xl font-bold">Descuentos por monto</h2>
    <p className="text-sm text-slate-600">Dos escalones opcionales, no acumulativos entre sí. Dejá el umbral vacío y porcentaje en 0 para desactivar.</p>
    <div className="grid md:grid-cols-2 gap-5"><div className="grid grid-cols-2 gap-3"><h3 className="col-span-2 font-semibold">Primer escalón</h3>{money('firstThreshold','Desde ($)')}{money('firstDiscount','Descuento (%)')}</div>
     <div className="grid grid-cols-2 gap-3"><h3 className="col-span-2 font-semibold">Segundo escalón</h3>{money('secondThreshold','Desde ($)')}{money('secondDiscount','Descuento (%)')}</div></div>
    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"><input type="checkbox" checked={draft.allowCoupons} onChange={e=>change('allowCoupons',e.target.checked)}/>Permitir cupones adicionales en esta categoría</label>
    <p className="text-xs text-slate-500">Cupones y descuentos automáticos pueden sumarse; considerá los márgenes comerciales antes de habilitarlos.</p>
   </section>
   <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-bold">Envío gratis</h2>
    <label className="block text-sm font-medium">Modalidad<select className={input} value={draft.shippingMode} onChange={e=>change('shippingMode',e.target.value)}>
     <option value="inherit">Usar umbral general de la tienda</option><option value="threshold">Definir umbral para esta lista</option>
     <option value="always">Siempre gratis</option><option value="disabled">Nunca gratis</option></select></label>
    {draft.shippingMode==='threshold'&&<div className="max-w-sm">{money('shippingThreshold','Envío gratis desde ($)',true)}</div>}
    <p className="text-xs text-slate-500">Solamente para entrega a domicilio, sobre el importe después de descuentos. La tarifa sin envío gratis sigue siendo estimada.</p>
   </section>
   <section className="rounded-xl border bg-white p-5 space-y-3"><label className="block text-sm font-semibold">Motivo del cambio (obligatorio)
    <textarea className={input} minLength={8} maxLength={300} required rows={2} value={draft.reason} onChange={e=>change('reason',e.target.value)} placeholder="Ej.: Actualización de condiciones comerciales"/></label>
    <p className="text-xs text-slate-500">Modificación anterior: {new Date(row.updated_at).toLocaleString('es-AR')}</p>
    <button disabled={busy} type="submit" className="bg-black text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50">{busy?'Guardando…':'Guardar condiciones'}</button></section>
  </form>}
 </main>
}
