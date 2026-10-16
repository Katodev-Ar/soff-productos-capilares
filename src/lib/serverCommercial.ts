/** Acceso al área comercial desde endpoints del servidor; nunca desde el navegador. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const commercialRoles = ['minorista', 'mayorista', 'revendedor', 'peluquero'] as const
export type CommercialRole = typeof commercialRoles[number]
export const isCommercialRole = (value: unknown): value is CommercialRole =>
  typeof value === 'string' && commercialRoles.some(role => role === value)

export const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }
export const serverError = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: noStoreHeaders })

export function requireShortJson(body: unknown, maxLength = 500): body is Record<string, unknown> {
  return body !== null && typeof body === 'object' && !Array.isArray(body) &&
    JSON.stringify(body).length <= maxLength + 512
}

export async function requireSoffCustomer(request: NextRequest): Promise<
  { db: SupabaseClient; userId: string; error?: never } |
  { error: NextResponse; db?: never; userId?: never }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !secret) return { error: serverError('Servidor no configurado.', 503) }
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) return { error: serverError('Iniciá sesión para continuar.', 401) }
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error } = await userClient.auth.getUser(token)
  if (error || !user) return { error: serverError('Sesión inválida.', 401) }
  return {
    db: createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }),
    userId: user.id,
  }
}

export function explainCommercialError(code: string | undefined): string {
  if (code === 'PGRST202' || code === '42P01' || code === '42883') {
    return 'El módulo comercial todavía no fue instalado en Supabase (migración P015 pendiente).'
  }
  return 'No se pudo completar la operación. Revisá el estado en el panel antes de volver a intentar.'
}
