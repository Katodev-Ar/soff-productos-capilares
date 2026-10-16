import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseProjectUrl, supabasePublishableKey } from './config'

/**
 * En builds de revisión sin Supabase, crear un cliente INERTE y sin tráfico de red.
 * La interfaz pública queda bloqueada por app/layout.tsx mientras falta configurar.
 * Esto evita que la compilación estática falle al importar el módulo.
 * En producción se deben definir variables reales Y reconstruir la aplicación.
 */
const unavailableFetch: typeof fetch = async () => {
  throw new Error('SOFF: Supabase no configurado. No se permiten operaciones de datos, usuarios ni cobros.')
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseProjectUrl, supabasePublishableKey)
  : createClient('https://soff-sin-configuracion.invalid', 'SOFF_DISABLED_NO_REAL_CREDENTIALS', {
      global: { fetch: unavailableFetch },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
