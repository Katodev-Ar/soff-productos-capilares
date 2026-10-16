'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
export default function ActualizarContrasena() {
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    void supabase.auth.getSession().then(({data}) => setSessionReady(Boolean(data.session)))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session) => {
      if (event==='PASSWORD_RECOVERY' || event==='SIGNED_IN') setSessionReady(Boolean(session))
    })
    return () => subscription.unsubscribe()
  },[])
  async function submit(e:React.FormEvent) {
    e.preventDefault()
    if (!sessionReady) return setMessage('Abrí el enlace de recuperación recibido por correo.')
    if (password.length<8) return setMessage('Usá al menos 8 caracteres.')
    const {error}=await supabase.auth.updateUser({password})
    if(error) return setMessage('No se pudo actualizar la contraseña. Solicitá otro enlace.')
    setConfirmed(true)
    setMessage('Contraseña actualizada. Ya podés iniciar sesión.')
    await supabase.auth.signOut()
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-8 shadow space-y-5">
    <h1 className="text-2xl font-bold">Nueva contraseña</h1>
    {!confirmed && <><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded border p-3"/><button disabled={!sessionReady} className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50">Guardar contraseña</button></>}
    {message && <p role="status">{message}</p>}
    <Link className="underline" href="/login">Iniciar sesión</Link>
  </form></main>
}
