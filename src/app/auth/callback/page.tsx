'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Procesando autenticación con Google...')

  useEffect(() => {
    let isMounted = true

    async function handleAuth() {
      try {
        // 1. Obtener la sesión activa de Supabase (resuelve hashes #access_token y códigos ?code=)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        let user: any = session?.user

        // Si no está de inmediato, esperar por onAuthStateChange
        if (!user) {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          user = currentUser
        }

        if (user) {
          setMessage('Sincronizando tu perfil y foto...')

          // Extraer datos de Google
          const meta = user.user_metadata || {}
          const avatarUrl = meta.avatar_url || meta.picture || null
          const fullName = meta.full_name || meta.name || ''
          const firstName = meta.first_name || (fullName ? fullName.split(' ')[0] : 'Usuario')
          const lastName = meta.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '')

          // Sincronizar en la tabla profiles
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle()

          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: user.id,
              first_name: firstName,
              last_name: lastName,
              avatar_url: avatarUrl,
              role: 'minorista'
            })
          } else {
            await supabase.from('profiles').update({
              avatar_url: avatarUrl || existingProfile.avatar_url,
              first_name: existingProfile.first_name || firstName,
              last_name: existingProfile.last_name || lastName
            }).eq('id', user.id)
          }

          if (isMounted) {
            setStatus('success')
            setMessage('¡Sesión iniciada con éxito! Redirigiendo...')
          }

          setTimeout(() => {
            window.location.href = '/'
          }, 800)
        } else {
          // Si no hubo sesión inmediata, escuchar evento de cambio de auth
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const u = session.user
              const meta = u.user_metadata || {}
              const avatarUrl = meta.avatar_url || meta.picture || null
              const fullName = meta.full_name || meta.name || ''
              const firstName = meta.first_name || (fullName ? fullName.split(' ')[0] : 'Usuario')
              const lastName = meta.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '')

              await supabase.from('profiles').upsert({
                id: u.id,
                first_name: firstName,
                last_name: lastName,
                avatar_url: avatarUrl,
                role: 'minorista'
              }, { onConflict: 'id' })

              if (isMounted) {
                setStatus('success')
                setMessage('¡Sesión iniciada con éxito! Redirigiendo...')
              }

              setTimeout(() => {
                window.location.href = '/'
              }, 800)
            }
          })

          // Timeout de seguridad
          setTimeout(() => {
            if (isMounted && status === 'loading') {
              window.location.href = '/'
            }
          }, 3500)

          return () => {
            subscription.unsubscribe()
          }
        }
      } catch (err: any) {
        console.error('Error en auth callback:', err)
        if (isMounted) {
          setStatus('error')
          setMessage('Ocurrió un error al procesar el inicio de sesión. Redirigiendo...')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        }
      }
    }

    handleAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-lg border border-slate-100 text-center space-y-4">
        {status === 'loading' && (
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-pink-600">
              Soff
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
        )}

        {status === 'error' && (
          <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
        )}

        <h2 className="text-lg font-bold text-slate-900">
          {status === 'loading' ? 'Conectando con Google' : status === 'success' ? '¡Bienvenido!' : 'Error de Autenticación'}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
