'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { BadgeCheck, Clock3, BriefcaseBusiness } from 'lucide-react'

type Role = 'mayorista'|'revendedor'|'peluquero'
type Request = {id:string;requested_role:Role;status:string;created_at:string;review_note:string}
const labels:Record<Role,string>={mayorista:'Mayorista',revendedor:'Revendedor',peluquero:'Peluquero'}
export default function MiCuentaComercialPage(){
 const router=useRouter()
 const [role,setRole]=useState('minorista')
 const [selected,setSelected]=useState<Role>('mayorista')
 const [details,setDetails]=useState('')
 const [requests,setRequests]=useState<Request[]>([])
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 async function call(method:'GET'|'POST',body?:unknown){
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){router.replace('/login');throw new Error('Iniciá sesión.')}
  const res=await fetch('/api/commercial/request',{method,headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'})
  const json=await res.json().catch(()=>({error:'Respuesta inválida.'}))
  if(!res.ok)throw new Error(json.error||'No se pudo procesar la solicitud.')
  return json
 }
 async function refresh(){
  setLoading(true)
  try{const result=await call('GET');setRole(result.role);setRequests(result.requests||[])}
  catch(e){setError(e instanceof Error?e.message:'No se pudo obtener el estado.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[]) // eslint-disable-line react-hooks/exhaustive-deps
 async function submit(event:React.FormEvent){
  event.preventDefault();if(saving)return;setError('');setNotice('');setSaving(true)
  try{await call('POST',{requested_role:selected,details});setNotice('Solicitud recibida. SOFF revisará tus datos antes de habilitar precios especiales.');setDetails('');await refresh()}
  catch(e){setError(e instanceof Error?e.message:'No se pudo enviar la solicitud.')}
  finally{setSaving(false)}
 }
 const pending=requests.some(r=>r.status==='pendiente')
 return <main className="min-h-screen bg-[#f9f7f5] pt-28 pb-16 px-4">
  <div className="max-w-3xl mx-auto space-y-6">
   <Link href="/cuenta" className="text-sm underline text-gray-600">← Volver a mi cuenta</Link>
   <div className="bg-white border shadow-sm rounded-2xl p-6 md:p-8 space-y-3">
    <div className="flex items-center gap-3"><BriefcaseBusiness className="text-[#6d5b51]" size={30}/><h1 className="font-bold text-3xl">Mi cuenta comercial</h1></div>
    <p className="text-gray-600">SOFF ofrece precios diferentes a minoristas, mayoristas, revendedores y profesionales de peluquería. Las categorías especiales requieren aprobación.</p>
    {loading?<p>Consultando tu perfil…</p>:<div className="rounded-xl bg-gray-100 p-4 flex items-center gap-3">
      <BadgeCheck/><span>Categoría actual: <strong className="capitalize">{role}</strong></span></div>}
    {notice&&<p role="status" className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-900">{notice}</p>}
    {error&&<p role="alert" className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-900">{error}</p>}
    {!loading&&role!=='admin'&&<form onSubmit={submit} className="space-y-4 pt-2">
     <h2 className="text-xl font-semibold">Solicitar lista especial</h2>
     {pending?<p className="bg-amber-50 rounded-lg p-3 text-amber-900 flex items-center gap-2"><Clock3 size={18}/>Ya tenés una solicitud pendiente. Se puede enviar otra después de recibir respuesta.</p>:<>
       <label className="block text-sm font-semibold">Tipo de cliente<select value={selected} onChange={e=>setSelected(e.target.value as Role)} className="block mt-1 w-full border p-3 rounded-xl bg-white">{(['mayorista','revendedor','peluquero'] as Role[]).map(x=><option key={x} value={x}>{labels[x]}</option>)}</select></label>
       <label className="block text-sm font-semibold">Contanos sobre tu actividad<textarea maxLength={500} rows={3} value={details} onChange={e=>setDetails(e.target.value)} className="block w-full border p-3 rounded-xl mt-1" placeholder="Actividad, local, emprendimiento o salón. No compartas contraseñas ni información bancaria."/></label>
       <p className="text-xs text-gray-600">Solicitar una categoría no garantiza su aprobación. Hasta ser aprobada seguís viendo los precios de tu categoría actual.</p>
       <button type="submit" disabled={saving||selected===role} className="rounded-full bg-[#6d5b51] text-white px-6 py-3 disabled:opacity-50">{saving?'Enviando…':selected===role?'Ya tenés esta categoría':'Enviar solicitud'}</button>
      </>}
    </form>}
   </div>
   {!loading&&requests.length>0&&<section className="bg-white border rounded-2xl p-6"><h2 className="text-xl font-bold mb-4">Historial de solicitudes</h2><div className="space-y-3">
    {requests.map(r=><div className="border-b pb-3 last:border-0" key={r.id}><div className="flex justify-between flex-wrap gap-2"><strong>{labels[r.requested_role]}</strong><span className="text-sm capitalize text-gray-600">{r.status}</span></div><p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('es-AR')}</p>{r.review_note&&<p className="text-sm mt-1">{r.review_note}</p>}</div>)}
   </div></section>}
  </div>
 </main>
}
