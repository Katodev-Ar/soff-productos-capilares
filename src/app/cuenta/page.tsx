'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, MapPin } from 'lucide-react'

export default function MiCuentaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  
  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dni, setDni] = useState('')
  const [addresses, setAddresses] = useState<any[]>([])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setPhone(data.phone || '')
        setDni(data.dni || '')
        setAddresses(Array.isArray(data.addresses) && data.addresses.length > 0 ? data.addresses : [{ label: 'Casa', address: '', city: '', cp: '' }])
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const validAddresses = addresses.filter(a => a.address.trim() !== '')

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dni: dni,
        addresses: validAddresses,
      })
      .eq('id', user.id)

    setSaving(false)
    if (!error) {
      alert('Perfil actualizado correctamente')
      router.refresh()
    } else {
      alert('Error al actualizar el perfil')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 py-3 px-4 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apellido *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 py-3 px-4 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 text-gray-500 py-3 px-4 rounded-xl cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DNI / CUIL *</label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 py-3 px-4 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono / Celular *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 py-3 px-4 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                required
              />
            </div>

            <div className="border-t border-gray-100 pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">Mis Direcciones</label>
                <button type="button" onClick={addAddress} className="text-sm text-black font-medium flex items-center gap-1 hover:underline">
                  <Plus className="h-4 w-4" /> Agregar otra
                </button>
              </div>

              <div className="space-y-4">
                {addresses.map((addr, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 relative">
                    {addresses.length > 1 && (
                      <button type="button" onClick={() => removeAddress(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    <div className="mb-3 w-2/3">
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">ETIQUETA</label>
                      <input
                        type="text"
                        value={addr.label}
                        onChange={e => updateAddress(i, 'label', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-900 py-2 px-3 rounded-lg focus:outline-none focus:border-black"
                        placeholder="Ej: Casa, Trabajo"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 font-semibold mb-1 block">DIRECCIÓN *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          required={i === 0}
                          value={addr.address}
                          onChange={e => updateAddress(i, 'address', e.target.value)}
                          className="w-full bg-white border border-gray-200 text-gray-900 py-2 pl-9 pr-3 rounded-lg focus:outline-none focus:border-black"
                          placeholder="Calle, número, piso, depto"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1 block">CIUDAD</label>
                        <input
                          type="text"
                          value={addr.city}
                          onChange={e => updateAddress(i, 'city', e.target.value)}
                          className="w-full bg-white border border-gray-200 text-gray-900 py-2 px-3 rounded-lg focus:outline-none focus:border-black"
                          placeholder="Ciudad"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1 block">CÓDIGO POSTAL</label>
                        <input
                          type="text"
                          value={addr.cp}
                          onChange={e => updateAddress(i, 'cp', e.target.value)}
                          className="w-full bg-white border border-gray-200 text-gray-900 py-2 px-3 rounded-lg focus:outline-none focus:border-black"
                          placeholder="CP"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between mt-6">
              <div className="text-sm">
                <span className="text-gray-500">Tipo de cuenta: </span>
                <span className="font-semibold text-black uppercase">{profile?.role || 'MINORISTA'}</span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
