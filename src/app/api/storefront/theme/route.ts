import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_STOREFRONT_THEME, THEME_SETTING_KEY, parseStorefrontTheme } from '@/lib/storefrontTheme'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' }

// Consulta pública de SOLO el nombre de diseño. La clave de servicio permanece en servidor.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({error:'Configuración no disponible.'},{status:503,headers:HEADERS})
  try {
    const db = createClient(url, secret, { auth: { persistSession:false, autoRefreshToken:false } })
    const { data, error } = await db.from('store_settings').select('value').eq('key',THEME_SETTING_KEY).maybeSingle()
    if (error) return NextResponse.json({error:'No se pudo consultar la apariencia.'},{status:503,headers:HEADERS})
    return NextResponse.json({theme:parseStorefrontTheme(data?.value ?? DEFAULT_STOREFRONT_THEME)},{headers:HEADERS})
  } catch {
    return NextResponse.json({error:'No se pudo consultar la apariencia.'},{status:503,headers:HEADERS})
  }
}
