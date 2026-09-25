'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Phone, CreditCard, MapPin, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dni, setDni] = useState('')
  const [addresses, setAddresses] = useState([{ label: 'Casa', address: '', city: '', cp: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1) // Step 1: credentials, Step 2: personal data
  const router = useRouter()

  const addAddress = () => {
    setAddresses([...addresses, { label: '', address: '', city: '', cp: '' }])
  }

  const removeAddress = (index: number) => {
    if (addresses.length <= 1) return
    setAddresses(addresses.filter((_, i) => i !== index))
  }

  const updateAddress = (index: number, field: string, value: string) => {
    const updated = [...addresses]
    updated[index] = { ...updated[index], [field]: value }
    setAddresses(updated)
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setStep(2)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !dni.trim() || !phone.trim()) {
      setError('Completá todos los campos obligatorios')
      setLoading(false)
      return
    }

    if (!addresses[0].address.trim()) {
      setError('Agregá al menos una dirección')
      setLoading(false)
      return
    }

    // 1. Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Update profile with personal data
    if (signUpData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          dni: dni,
          addresses: addresses.filter(a => a.address.trim() !== ''),
        })
        .eq('id', signUpData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Try insert if update fails (profile might not exist yet)
        await supabase
          .from('profiles')
          .insert({
            id: signUpData.user.id,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            dni: dni,
            addresses: addresses.filter(a => a.address.trim() !== ''),
            role: 'retail',
          })
      }
    }

    router.push('/')
    router.refresh()
    setLoading(false)
  }

  const inputClass = "block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2.5 border focus:ring-black focus:border-black outline-none"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Crear cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 ? 'Paso 1 de 2 — Datos de acceso' : 'Paso 2 de 2 — Datos personales'}
        </p>
        {/* Progress bar */}
        <div className="mt-4 flex gap-2 max-w-xs mx-auto">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl sm:px-10 border border-gray-100">

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleStep1}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="tu@correo.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repetí tu contraseña" />
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</div>}

              <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none">
                Continuar
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                ¿Ya tenés cuenta?{' '}
                <Link href="/login" className="font-medium text-black hover:underline">Iniciar sesión</Link>
              </p>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleRegister}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Nombre" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Apellido" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI / CUIL *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" required value={dni} onChange={e => setDni(e.target.value)} className={inputClass} placeholder="Ej: 35.123.456 o 20-35123456-7" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="Ej: 381 650 5741" />
                </div>
              </div>

              {/* Addresses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Direcciones de envío *</label>
                  <button type="button" onClick={addAddress} className="text-xs text-black font-medium flex items-center gap-1 hover:underline">
                    <Plus className="h-3 w-3" /> Agregar otra
                  </button>
                </div>

                <div className="space-y-4">
                  {addresses.map((addr, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 relative">
                      {addresses.length > 1 && (
                        <button type="button" onClick={() => removeAddress(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={addr.label}
                          onChange={e => updateAddress(i, 'label', e.target.value)}
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-transparent border-none outline-none w-full"
                          placeholder="Etiqueta (ej: Casa, Trabajo)"
                        />
                      </div>
                      <div className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required={i === 0}
                          value={addr.address}
                          onChange={e => updateAddress(i, 'address', e.target.value)}
                          className="block w-full pl-9 text-sm border-gray-200 rounded-lg py-2 border focus:ring-black focus:border-black outline-none"
                          placeholder="Dirección completa"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={addr.city}
                          onChange={e => updateAddress(i, 'city', e.target.value)}
                          className="block w-full text-sm border-gray-200 rounded-lg py-2 px-3 border focus:ring-black focus:border-black outline-none"
                          placeholder="Ciudad"
                        />
                        <input
                          type="text"
                          value={addr.cp}
                          onChange={e => updateAddress(i, 'cp', e.target.value)}
                          className="block w-full text-sm border-gray-200 rounded-lg py-2 px-3 border focus:ring-black focus:border-black outline-none"
                          placeholder="Código Postal"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</div>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 px-4 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Volver
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-50">
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
