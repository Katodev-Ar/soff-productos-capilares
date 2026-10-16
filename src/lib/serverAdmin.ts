import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Authorized = { db: SupabaseClient; userId: string; error?: never }
type Denied = { error: NextResponse; db?: never; userId?: never }

// El rol se verifica en la BD con clave de servicio, nunca por datos del navegador.
export async function requireSoffAdmin(request: NextRequest): Promise<Authorized | Denied> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return { error: NextResponse.json({error:'Servidor no configurado.'},{status:503}) }
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1]
  if (!token) return { error: NextResponse.json({error:'Ingresá como administrador.'},{status:401}) }
  const userClient = createClient(url, anon, {auth:{persistSession:false,autoRefreshToken:false}})
  const {data:{user},error:authError} = await userClient.auth.getUser(token)
  if (authError || !user) return {error:NextResponse.json({error:'Sesión inválida.'},{status:401})}
  const db = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:profile,error:profileError} = await db.from('profiles').select('role').eq('id',user.id).maybeSingle()
  if (profileError || profile?.role!=='admin') return {error:NextResponse.json({error:'Acceso no autorizado.'},{status:403})}
  return {db,userId:user.id}
}
export function missingMigration(code?: string): boolean {return code==='PGRST202'||code==='42883'}
