'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/actualizar-contrasena`,
      })
      if (error) throw error
      setMessage('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu contraseña.')
    } catch {
      setMessage('No se pudo solicitar la recuperación. Intentá más tarde.')
    } finally { setLoading(false) }
  }
  return <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <form onSubmit={send} className="w-full max-w-md rounded-xl bg-white p-8 shadow space-y-5">
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      <label htmlFor="recovery-email" className="block text-sm">Correo electrónico</label>
      <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded border p-3" />
      <button disabled={loading} className="rounded-full bg-black px-5 py-3 text-white disabled:opacity-50">Enviar instrucciones</button>
      {message && <p role="status" className="text-sm">{message}</p>}
      <div><Link href="/login" className="underline text-sm">Volver a iniciar sesión</Link></div>
    </form>
  </main>
}
