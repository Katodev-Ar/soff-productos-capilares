/**
 * Configuración pública validada: estas dos variables son públicas (no secretos).
 * Nunca se sustituye la clave service_role del servidor por una clave de prueba.
 * Variables NEXT_PUBLIC_* quedan incorporadas en el bundle durante `next build`:
 * si se configuran más tarde, es obligatorio compilar/publicar de nuevo.
 */
export const supabaseProjectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
export const supabasePublishableKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

function isUsableProjectUrl(value: string): boolean {
  try {
    const u = new URL(value)
    const local = (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.protocol === 'http:'
    const secure = u.protocol === 'https:' && !u.hostname.endsWith('.invalid') && !u.hostname.endsWith('.example')
    return (local || secure) && Boolean(u.hostname)
  } catch {
    return false
  }
}

export const isSupabaseConfigured =
  isUsableProjectUrl(supabaseProjectUrl) &&
  supabasePublishableKey.length > 10 &&
  !/^REEMPLAZAR/i.test(supabasePublishableKey) &&
  !/^TU[_-]/i.test(supabasePublishableKey)
