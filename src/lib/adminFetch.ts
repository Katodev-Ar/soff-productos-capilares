import { supabase } from '@/lib/supabase/client'
export async function postAsSoffAdmin(path: string, payload: unknown): Promise<Record<string, unknown>> {
  const {data:{session}}=await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('La sesión venció. Volvé a ingresar.')
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)})
  const data=await response.json().catch(()=>({error:'No se recibió respuesta válida del servidor.'})) as Record<string,unknown>
  if (!response.ok) throw new Error(typeof data.error==='string'?data.error:'No se pudo completar la operación.')
  return data
}

export async function getAsSoffAdmin(path: string): Promise<Record<string, unknown>> {
  const {data:{session}}=await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('La sesión venció. Volvé a ingresar.')
  const response=await fetch(path,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
  const data=await response.json().catch(()=>({error:'No se recibió respuesta válida del servidor.'})) as Record<string,unknown>
  if (!response.ok) throw new Error(typeof data.error==='string'?data.error:'No se pudo consultar el catálogo.')
  return data
}
