'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Trash2, Edit2, BadgePercent, CheckCircle, XCircle } from 'lucide-react'

type Coupon = {
  id: string
  code: string
  discount_percentage: number
  max_uses: number | null
  current_uses: number
  is_active: boolean
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(10)
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setCoupons(data)
    setLoading(false)
  }

  const resetForm = () => {
    setCode('')
    setDiscount(10)
    setMaxUses('')
    setIsActive(true)
    setEditingId(null)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id)
    setCode(coupon.code)
    setDiscount(coupon.discount_percentage)
    setMaxUses(coupon.max_uses === null ? '' : coupon.max_uses)
    setIsActive(coupon.is_active)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return alert('El código es obligatorio')

    const payload = {
      code: code.toUpperCase().trim(),
      discount_percentage: discount,
      max_uses: maxUses === '' ? null : Number(maxUses),
      is_active: isActive
    }

    if (editingId) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editingId)
      if (error) alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('coupons').insert([payload])
      if (error) {
        if (error.code === '23505') alert('Ese código ya existe')
        else alert('Error: ' + error.message)
      }
    }

    resetForm()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar cupón?')) return
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  if (loading && coupons.length === 0) return <div className="p-8">Cargando cupones...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cupones de Descuento</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Cupón</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código del Cupón *</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required placeholder="Ej: SOFF10" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none uppercase font-bold" />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">% Descuento</label>
                <input type="number" min="1" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Límite usos (vacio=inf)</label>
                <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded cursor-pointer" id="isActive" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">Cupón Activo</label>
            </div>

            <div className="pt-4 flex gap-2">
              <button type="submit" className="flex-1 bg-[#002f5b] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90">{editingId ? 'Guardar Cambios' : 'Crear Cupón'}</button>
              {editingId && <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200">Cancelar</button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {coupons.length === 0 ? (
             <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
               <BadgePercent className="mx-auto h-12 w-12 text-gray-300 mb-3" />
               <p className="text-gray-500">No hay cupones creados.</p>
             </div>
          ) : (
            coupons.map(coupon => (
              <div key={coupon.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5 items-center">
                <div className="w-full sm:w-auto flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-xl text-gray-900 font-mono bg-gray-100 px-3 py-1 rounded">{coupon.code}</h3>
                    <span className="text-sm font-bold text-white bg-brand-primary px-2 py-1 rounded">-{coupon.discount_percentage}% OFF</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-gray-600">Usos: <b>{coupon.current_uses}</b> / {coupon.max_uses === null ? '∞' : coupon.max_uses}</span>
                    {coupon.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-medium"><CheckCircle size={14}/> Activo</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-medium"><XCircle size={14}/> Desactivado</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                  <button onClick={() => handleEdit(coupon)} className="flex-1 sm:flex-none p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex justify-center"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(coupon.id)} className="flex-1 sm:flex-none p-2 text-red-600 hover:bg-red-50 rounded-lg flex justify-center"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
