'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, BarChart3, ClipboardList, Search, Users, Wallet, AlertTriangle, RefreshCw } from 'lucide-react'
import { getAsSoffAdmin, postAsSoffAdmin } from '@/lib/adminFetch'
const commercialRoles = ['minorista', 'mayorista', 'revendedor', 'peluquero'] as const
type CommercialRole = typeof commercialRoles[number]

type ProductRow = {
 id:string;name:string;internal_code:string|null;stock:number|null;
 price_minorista:number|string;price_mayorista:number|string;
 price_revendedor:number|string;price_peluquero:number|string
}
type UserRow = { id:string;first_name:string|null;last_name:string|null;email:string|null;phone:string|null;role:string;created_at:string }
type RequestRow = { id:string;user_id:string;requested_role:string;details:string;status:string;created_at:string;reviewed_at:string|null;review_note:string }
type CostRow = {product_id:string;unit_cost:number|string}
type Data = {products:ProductRow[];users:UserRow[];requests:RequestRow[];costs:CostRow[]}
type Tab = 'solicitudes'|'clientes'|'precios'
type EditPrice = { product_id:string;name:string;minorista:string;mayorista:string;revendedor:string;peluquero:string;cost:string }
type Assign = {id:string; name:string;role:CommercialRole;note:string}
const roleLabels:Record<CommercialRole,string> = {minorista:'Minorista',mayorista:'Mayorista',revendedor:'Revendedor',peluquero:'Peluquero'}
const money=(amount:number|string|null|undefined)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2}).format(Number(amount??0))
const date=(iso:string)=>new Date(iso).toLocaleDateString('es-AR')
const isRole=(role:string):role is CommercialRole=>commercialRoles.some(x=>x===role)

export default function AdminComercialPage(){
 const [data,setData]=useState<Data|null>(null)
 const [tab,setTab]=useState<Tab>('solicitudes')
 const [search,setSearch]=useState('')
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [editing,setEditing]=useState<EditPrice|null>(null)
 const [assign,setAssign]=useState<Assign|null>(null)
 const [decision,setDecision]=useState<{request:RequestRow;approve:boolean;note:string}|null>(null)
 const load=useCallback(async()=>{
   setLoading(true);setError('')
   try{
     const response=await getAsSoffAdmin('/api/admin/commercial')
     setData(response as Data)
   }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el panel.')}
   finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const usersById=useMemo(()=>new Map((data?.users??[]).map(u=>[u.id,u])),[data])
 const costById=useMemo(()=>new Map((data?.costs??[]).map(x=>[x.product_id,Number(x.unit_cost)])),[data])
 const normalizeSearch=search.toLocaleLowerCase('es-AR').trim()
 const filteredUsers=(data?.users??[]).filter(u=>`${u.first_name||''} ${u.last_name||''} ${u.email||''} ${u.role||''}`.toLocaleLowerCase('es-AR').includes(normalizeSearch))
 const filteredProducts=(data?.products??[]).filter(p=>`${p.name} ${p.internal_code||''}`.toLocaleLowerCase('es-AR').includes(normalizeSearch))
 const pending=(data?.requests??[]).filter(r=>r.status==='pendiente')
 const commercialClients=(data?.users??[]).filter(u=>isRole(u.role)&&u.role!=='minorista').length
 const priced=(data?.products??[]).filter(p=>costById.has(p.id)).length
 const margin=(price:number, cost:number|undefined)=>cost===undefined||price<=0?null:(price-cost)/price*100
 const startEditing=(p:ProductRow)=>setEditing({product_id:p.id,name:p.name,
   minorista:String(p.price_minorista??0),mayorista:String(p.price_mayorista??0),
   revendedor:String(p.price_revendedor??0),peluquero:String(p.price_peluquero??0),
   cost:costById.has(p.id)?String(costById.get(p.id)):''})
 async function run(path:string,body:unknown,message:string){
   if(saving)return
   setSaving(true);setError('');setNotice('')
   try{await postAsSoffAdmin(path,body);setEditing(null);setAssign(null);setDecision(null);setNotice(message);await load()}
   catch(e){setError(e instanceof Error?e.message:'No se pudo guardar. Revisá la operación.')}finally{setSaving(false)}
 }
 function savePrices(event:React.FormEvent){
   event.preventDefault();if(!editing)return
   const fields=['minorista','mayorista','revendedor','peluquero'] as const
   const values=fields.map(k=>editing[k].trim()===''?NaN:Number(editing[k]))
   const cost=editing.cost.trim()===''?null:Number(editing.cost)
   if(values.some(v=>!Number.isFinite(v)||v<0||v>1000000000||Math.abs(v*100-Math.round(v*100))>0.00001)||values[0]<=0||
     (cost!==null&&(!Number.isFinite(cost)||cost<0||Math.abs(cost*100-Math.round(cost*100))>0.00001))){
     setError('Ingresá importes válidos: minorista mayor a cero, máximo dos decimales.');return
   }
   void run('/api/admin/commercial/prices',{product_id:editing.product_id,
      minorista:values[0],mayorista:values[1],revendedor:values[2],peluquero:values[3],cost},
      'Precios y costo registrados. El cambio queda auditado.')
 }
 return <div className="space-y-6 text-gray-900">
  <div className="flex flex-wrap justify-between items-center gap-3">
   <div><h1 className="text-3xl font-bold">Gestión comercial</h1>
     <p className="text-gray-600 mt-1">Cuatro listas de precios, clientes, aprobaciones y rentabilidad.</p></div>
   <button type="button" onClick={()=>void load()} disabled={loading||saving}
     className="rounded-xl border bg-white px-4 py-2 flex gap-2 items-center disabled:opacity-40"><RefreshCw size={17}/> Actualizar</button>
  </div>
  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
   {([{label:'Solicitudes pendientes',value:pending.length,icon:ClipboardList},
     {label:'Clientes comerciales',value:commercialClients,icon:Users},
     {label:'Productos',value:data?.products.length??0,icon:BarChart3},
     {label:'Con costo informado',value:priced,icon:Wallet}]).map(x=><div key={x.label} className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="flex gap-2 items-center text-gray-500 text-sm"><x.icon size={18}/>{x.label}</div>
      <div className="text-3xl font-bold mt-2">{x.value}</div>
     </div>)}
  </div>
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950 flex items-start gap-2">
   <AlertTriangle className="shrink-0 mt-0.5" size={18}/>
   <p>Solo administradores pueden asignar listas especiales. El costo real se guarda por separado y no se muestra al comprador. El margen es <strong>bruto estimado sobre precio de venta</strong>: no contempla impuestos, comisiones, envíos ni otros gastos. Las compras mínimas, descuentos y beneficios de envío se administran desde <a href="/admin/condiciones-comerciales" className="font-semibold underline">Condiciones por canal</a>.</p>
  </div>
  {notice&&<p role="status" className="rounded-xl bg-green-50 border border-green-200 p-3 text-green-900">{notice}</p>}
  {error&&<p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-900">{error}</p>}
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones comerciales">
   {([{id:'solicitudes',name:`Solicitudes (${pending.length})`},{id:'clientes',name:'Clientes y permisos'},{id:'precios',name:'Listas de precios'}] as const).map(item=><button
      key={item.id} role="tab" aria-selected={tab===item.id} onClick={()=>{setTab(item.id);setSearch('');setError('')}}
      className={`rounded-full px-4 py-2 font-semibold text-sm ${tab===item.id?'bg-gray-900 text-white':'bg-white border text-gray-700'}`}>{item.name}</button>)}
  </div>
  {tab!=='solicitudes'&&<div className="relative"><Search size={18} className="absolute top-3 left-4 text-gray-400"/>
    <input aria-label="Buscar" className="bg-white border rounded-xl w-full pl-12 py-3 pr-4" value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='clientes'?'Buscar cliente, correo o categoría':'Buscar producto por nombre o código'}/></div>}
  {loading?<p className="bg-white p-6 rounded-xl">Cargando gestión comercial…</p>:data&&<>
   {tab==='solicitudes'&&<div className="space-y-4">
    {data.requests.length===0&&<p className="rounded-xl border bg-white p-6 text-gray-600">Todavía no hay solicitudes comerciales.</p>}
    {data.requests.map(r=>{
      const u=usersById.get(r.user_id)
      return <div key={r.id} className="border bg-white rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4">
       <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2"><strong>{u?`${u.first_name||''} ${u.last_name||''}`:'Usuario no disponible'}</strong>
          <span className="bg-gray-100 text-xs rounded-full px-2 py-1">{roleLabels[r.requested_role as CommercialRole]??r.requested_role}</span>
          <span className={`text-xs font-semibold rounded-full px-2 py-1 ${r.status==='pendiente'?'bg-amber-100 text-amber-900':'bg-gray-100 text-gray-700'}`}>{r.status}</span>
        </div>
        <p className="text-sm text-gray-500">{u?.email||'Sin correo'} · Solicitada: {date(r.created_at)}</p>
        {r.details&&<p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{r.details}</p>}
        {r.review_note&&<p className="text-sm text-gray-500">Resolución: {r.review_note}</p>}
       </div>
       {r.status==='pendiente'&&<div className="flex items-start gap-2 shrink-0">
        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm" onClick={()=>setDecision({request:r,approve:true,note:''})}>Aprobar</button>
        <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm" onClick={()=>setDecision({request:r,approve:false,note:''})}>Rechazar</button>
       </div>}
      </div>
    })}
   </div>}
   {tab==='clientes'&&<div className="border rounded-xl bg-white overflow-x-auto">
    <table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Cliente','Correo / teléfono','Categoría actual','Acción'].map(h=><th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
     <tbody>{filteredUsers.slice(0,150).map(u=><tr key={u.id} className="border-t">
       <td className="p-3 font-medium">{u.first_name} {u.last_name}</td><td className="p-3 text-gray-600">{u.email}<div>{u.phone}</div></td>
       <td className="p-3">{isRole(u.role)?roleLabels[u.role]:u.role}</td>
       <td className="p-3">{u.role==='admin'?<span className="text-gray-400">Administrador protegido</span>:
        <button onClick={()=>setAssign({id:u.id,name:`${u.first_name||''} ${u.last_name||''}`,role:isRole(u.role)?u.role:'minorista',note:''})} className="rounded-lg border px-3 py-2 hover:bg-gray-50">Cambiar categoría</button>}</td>
      </tr>)}</tbody>
    </table><p className="text-xs text-gray-500 p-3">Mostrando {Math.min(filteredUsers.length,150)} de {filteredUsers.length} clientes encontrados.</p>
   </div>}
   {tab==='precios'&&<div className="space-y-3">
     <p className="text-sm text-gray-600">Precio 0 en una lista especial significa que el producto no se puede comprar con esa categoría. <Link href="/admin/productos" className="underline">También podés editar la ficha completa del producto.</Link></p>
     <div className="border rounded-xl bg-white overflow-x-auto"><table className="w-full text-sm min-w-[880px]"><thead className="bg-gray-50"><tr>
       {['Producto','Minorista','Mayorista','Revendedor','Peluquero','Costo real','Margen minorista','Modificar'].map(h=><th key={h} className="text-left p-3">{h}</th>)}
      </tr></thead><tbody>{filteredProducts.slice(0,150).map(p=>{
       const cost=costById.get(p.id),m=margin(Number(p.price_minorista),cost)
       const showMargin=(price:number|string)=>{const percent=margin(Number(price),cost);return percent===null?'':`${percent.toFixed(1)}% bruto`}
       return <tr key={p.id} className="border-t"><td className="p-3 font-semibold max-w-64">{p.name}<div className="text-xs font-normal text-gray-500">{p.internal_code||'Sin código'} · Stock: {p.stock}</div></td>
        <td className="p-3">{money(p.price_minorista)}<div className="text-xs text-gray-500">{showMargin(p.price_minorista)}</div></td><td className="p-3">{money(p.price_mayorista)}<div className="text-xs text-gray-500">{showMargin(p.price_mayorista)}</div></td>
        <td className="p-3">{money(p.price_revendedor)}<div className="text-xs text-gray-500">{showMargin(p.price_revendedor)}</div></td><td className="p-3">{money(p.price_peluquero)}<div className="text-xs text-gray-500">{showMargin(p.price_peluquero)}</div></td>
        <td className="p-3">{cost===undefined?'Sin informar':money(cost)}</td>
        <td className={`p-3 font-semibold ${m!==null&&m<0?'text-red-700':'text-gray-800'}`}>{m===null?'—':`${m.toFixed(1)}%`}</td>
        <td className="p-3"><button onClick={()=>startEditing(p)} className="rounded-lg px-3 py-2 bg-black text-white">Editar</button></td>
       </tr>})}</tbody></table><p className="text-xs text-gray-500 p-3">Mostrando {Math.min(filteredProducts.length,150)} de {filteredProducts.length} productos encontrados.</p></div>
   </div>}
  </>}
  {editing&&<div className="fixed inset-0 z-[90] bg-black/60 p-3 flex items-center justify-center"><form onSubmit={savePrices} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-4">
   <h2 className="text-xl font-bold">Editar listas de precios</h2><p className="font-medium">{editing.name}</p>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['minorista','mayorista','revendedor','peluquero'] as const).map(k=><label key={k} className="text-sm font-medium">Precio {roleLabels[k]}<input
    required type="number" min={k==='minorista'?'0.01':'0'} max="1000000000" step="0.01"
    value={editing[k]} onChange={e=>setEditing({...editing,[k]:e.target.value})}
    className="block w-full rounded-xl border p-3 mt-1"/></label>)}</div>
   <label className="text-sm font-medium block">Costo unitario real de compra (optativo)<input type="number" min="0" max="1000000000" step="0.01"
    value={editing.cost} onChange={e=>setEditing({...editing,cost:e.target.value})} placeholder="Dejar vacío si no está confirmado" className="block w-full rounded-xl border p-3 mt-1"/></label>
   <p className="text-xs text-gray-500">El costo es confidencial. Dejarlo vacío elimina el costo registrado, sin modificar el campo original price_base. Guardar registra historial comercial.</p>
   <div className="flex gap-2 justify-end"><button type="button" disabled={saving} onClick={()=>setEditing(null)} className="px-4 py-2 border rounded-xl">Cancelar</button><button disabled={saving} className="px-4 py-2 bg-black text-white rounded-xl disabled:opacity-50">{saving?'Guardando…':'Guardar cambios'}</button></div>
  </form></div>}
  {assign&&<div className="fixed inset-0 z-[90] bg-black/60 p-3 flex items-center justify-center"><form onSubmit={e=>{e.preventDefault();void run('/api/admin/commercial/assign',{user_id:assign.id,role:assign.role,note:assign.note},'Categoría actualizada con historial.')}} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
   <h2 className="text-xl font-bold">Asignar categoría comercial</h2><p>{assign.name}</p>
   <label className="block text-sm font-semibold">Nueva categoría<select className="block border rounded-lg p-3 w-full mt-1" value={assign.role} onChange={e=>setAssign({...assign,role:e.target.value as CommercialRole})}>{commercialRoles.map(x=><option key={x} value={x}>{roleLabels[x]}</option>)}</select></label>
   <label className="block text-sm font-semibold">Motivo del cambio (obligatorio)<textarea required minLength={8} maxLength={500} value={assign.note} onChange={e=>setAssign({...assign,note:e.target.value})} className="block border rounded-lg p-3 w-full mt-1" rows={3} placeholder="Ejemplo: documentación comercial verificada"/></label>
   <p className="text-xs text-amber-800">La modificación impacta en los precios de futuras compras. No altera el precio de pedidos históricos.</p>
   <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setAssign(null)} className="px-4 py-2 border rounded-lg">Cancelar</button><button disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg">{saving?'Guardando…':'Confirmar'}</button></div>
  </form></div>}
  {decision&&<div className="fixed inset-0 z-[90] bg-black/60 p-3 flex items-center justify-center"><form onSubmit={e=>{e.preventDefault();void run('/api/admin/commercial/decision',{request_id:decision.request.id,approve:decision.approve,note:decision.note},decision.approve?'Solicitud aprobada.':'Solicitud rechazada.')}} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
   <div className="flex items-center gap-2"><BadgeCheck/><h2 className="text-xl font-bold">{decision.approve?'Aprobar cuenta':'Rechazar solicitud'}</h2></div>
   <p className="text-sm text-gray-600">Categoría solicitada: {decision.request.requested_role}. {decision.approve?'Esto habilita inmediatamente su lista de precios, una vez que el cambio se publique en Supabase.':'Se conserva su categoría actual.'}</p>
   <label className="block text-sm font-medium">Observación (optativa)<textarea maxLength={500} rows={3} className="block border rounded-lg p-3 w-full mt-1" value={decision.note} onChange={e=>setDecision({...decision,note:e.target.value})}/></label>
   <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setDecision(null)} className="px-4 py-2 border rounded-lg">Cancelar</button><button disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg">{saving?'Procesando…':'Confirmar decisión'}</button></div>
  </form></div>}
 </div>
}
