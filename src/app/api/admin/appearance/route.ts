import { type NextRequest, NextResponse } from 'next/server'
import { requireSoffAdmin } from '@/lib/serverAdmin'
import { isStorefrontTheme, THEME_SETTING_KEY } from '@/lib/storefrontTheme'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

// Solo un admin autenticado puede publicar una apariencia para todos los visitantes.
export async function POST(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if (auth.error) return auth.error
  const body: unknown = await req.json().catch(() => null)
  const theme = body && typeof body === 'object' && 'theme' in body ? body.theme : null
  if (!isStorefrontTheme(theme)) {
    return NextResponse.json({error:'Elegí un diseño válido.'},{status:400,headers:HEADERS})
  }
  const { error } = await auth.db.from('store_settings').upsert({
    key: THEME_SETTING_KEY,
    value: theme,
    updated_at: new Date().toISOString(),
  }, { onConflict:'key' })
  if (error) return NextResponse.json({error:'No se pudo publicar el diseño. Revisá store_settings.'},{status:503,headers:HEADERS})
  return NextResponse.json({ok:true,theme},{headers:HEADERS})
}
