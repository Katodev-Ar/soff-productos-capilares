'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Package, CheckCircle, XCircle, Search } from 'lucide-react'
import { Product } from '@/lib/catalog'

type Combo = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  discount_percentage: number
  is_active: boolean
  combo_products?: { product: Product }[]
}

export default function AdminCombos() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [discount, setDiscount] = useState(10)
  const [isActive, setIsActive] = useState(true)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch products for the selector
    const { data: pData } = await supabase.from('products').select('*').order('name')
    if (pData) setProducts(pData)

    // Fetch combos with their nested products
    const { data: cData, error } = await supabase
      .from('combos')
      .select('*, combo_products(product:products(*))')
      .order('created_at', { ascending: false })

    if (!error && cData) {
      // @ts-ignore
      setCombos(cData)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setImageUrl('')
    setDiscount(10)
    setIsActive(true)
    setSelectedProductIds([])
    setEditingId(null)
  }

  const handleEdit = (combo: Combo) => {
    setEditingId(combo.id)
    setName(combo.name)
    setDescription(combo.description || '')
    setImageUrl(combo.image_url || '')
    setDiscount(combo.discount_percentage)
    setIsActive(combo.is_active)
    setSelectedProductIds(combo.combo_products?.map(cp => cp.product.id) || [])
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return alert('El nombre es obligatorio')
    if (selectedProductIds.length === 0) return alert('Debes seleccionar al menos un producto')

    const payload = {
      name,
      description,
      image_url: imageUrl,
      discount_percentage: discount,
      is_active: isActive
    }

    try {
      let comboId = editingId

      if (editingId) {
        await supabase.from('combos').update(payload).eq('id', editingId)
        // Delete old relations
        await supabase.from('combo_products').delete().eq('combo_id', editingId)
      } else {
        const { data, error } = await supabase.from('combos').insert([payload]).select().single()
        if (error) throw error
        comboId = data.id
      }

      // Insert new relations
      const relations = selectedProductIds.map(pid => ({
        combo_id: comboId,
        product_id: pid
      }))
      
      const { error: relError } = await supabase.from('combo_products').insert(relations)
      if (relError) throw relError

      resetForm()
      fetchData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar combo?')) return
    const { error } = await supabase.from('combos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Calcular precio total original para el combo en edición (usando precio minorista como referencia visual)
  const sumOriginal = selectedProductIds.reduce((acc, id) => {
    const p = products.find(prod => prod.id === id)
    return acc + (p?.price_minorista ? Number(p.price_minorista) : 0)
  }, 0)
  const sumDiscounted = sumOriginal * (1 - discount / 100)

  if (loading && combos.length === 0) return <div className="p-8">Cargando combos...</div>

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Combos y Rutinas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulario */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Combo</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Combo *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" placeholder="Ej: Rutina Hidratación Intensa" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">% de Descuento</label>
                <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
              </div>
              <div className="flex-1 flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>
            </div>

            {/* Selector de productos */}
            <div className="mt-6 border-t pt-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Productos incluidos ({selectedProductIds.length})</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-brand-primary focus:outline-none" 
                />
              </div>
              
              <div className="h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                {filteredProducts.map(p => (
                  <label key={p.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="mt-1 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-500"></p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mt-4">
              <div className="flex justify-between text-sm mb-1 text-gray-600">
                <span>Precio Regular:</span>
                <span className="line-through"></span>
              </div>
              <div className="flex justify-between font-bold text-[#002f5b]">
                <span>Precio Combo:</span>
                <span></span>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button type="submit" className="flex-1 bg-[#002f5b] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90">{editingId ? 'Guardar Cambios' : 'Crear Combo'}</button>
              {editingId && <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200">Cancelar</button>}
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-7 space-y-4">
          {combos.map(combo => (
            <div key={combo.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {combo.image_url ? (
                  <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-gray-300 h-10 w-10" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{combo.name}</h3>
                    {combo.description && <p className="text-sm text-gray-500">{combo.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(combo)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(combo.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className="text-xs font-bold text-white bg-brand-primary px-2 py-1 rounded">-{combo.discount_percentage}% OFF</span>
                  {combo.is_active ? <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Oculto</span>}
                  <span className="text-xs text-gray-500">{combo.combo_products?.length || 0} productos</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {combo.combo_products?.map((cp, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                      {cp.product.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {combos.length === 0 && (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No hay combos creados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
