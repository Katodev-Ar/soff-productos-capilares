'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react'

type Banner = {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
  display_order: number
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState(0)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })

    if (!error && data) setBanners(data)
    setLoading(false)
  }

  const resetForm = () => {
    setTitle('')
    setImageUrl('')
    setLinkUrl('')
    setIsActive(true)
    setDisplayOrder(0)
    setEditingId(null)
  }

  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id)
    setTitle(banner.title || '')
    setImageUrl(banner.image_url)
    setLinkUrl(banner.link_url || '')
    setIsActive(banner.is_active)
    setDisplayOrder(banner.display_order)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl) return alert('La URL de la imagen es obligatoria')

    const payload = {
      title,
      image_url: imageUrl,
      link_url: linkUrl,
      is_active: isActive,
      display_order: displayOrder
    }

    if (editingId) {
      const { error } = await supabase.from('banners').update(payload).eq('id', editingId)
      if (error) alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('banners').insert([payload])
      if (error) alert('Error: ' + error.message)
    }

    resetForm()
    fetchBanners()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar banner?')) return
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchBanners()
  }

  if (loading && banners.length === 0) return <div className="p-8">Cargando banners...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banners Promocionales</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Banner</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título (interno)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de la Imagen *</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enlace (Opcional)</label>
              <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <input type="number" value={displayOrder} onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
              </div>
              <div className="flex-1 flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>
            </div>
            <div className="pt-4 flex gap-2">
              <button type="submit" className="flex-1 bg-[#002f5b] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90">{editingId ? 'Guardar' : 'Crear'}</button>
              {editingId && <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200">Cancelar</button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
              <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{banner.title || 'Banner'}</h3>
                {banner.link_url && <p className="text-sm text-gray-500 truncate">{banner.link_url}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">Orden: {banner.display_order}</span>
                  {banner.is_active ? <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Oculto</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEdit(banner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
