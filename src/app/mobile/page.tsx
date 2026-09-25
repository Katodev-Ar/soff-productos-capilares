'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function MobileLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email o contraseña incorrectos')
        setLoading(false)
        return
      }

      // Verify admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        setError('No tenés permisos de administrador')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      router.push('/mobile/dashboard')
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30">
          <span className="text-white font-bold text-3xl">S</span>
        </div>
        <h1 className="text-white text-2xl font-bold">Soff Admin</h1>
        <p className="text-gray-400 text-sm mt-1">Panel de administración</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div>
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@soff.com"
            required
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3.5 text-base placeholder-gray-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-2">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3.5 text-base placeholder-gray-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-colors pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pink-500 text-white font-semibold rounded-xl py-3.5 text-base hover:bg-pink-600 active:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              Iniciar sesión
            </>
          )}
        </button>
      </form>

      <p className="text-gray-600 text-xs mt-8">
        Soff Productos Capilares © {new Date().getFullYear()}
      </p>
    </div>
  )
}
