'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Search, Edit3, Save, X, Package, Plus, Trash2 } from 'lucide-react'

export default function AdminProductosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null) // null = new product
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    how_to_use: '',
    image_url: '',
    stock: 0,
    price_minorista: 0,
    price_mayorista: 0,
    price_peluquero: 0,
    price_revendedor: 0
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (data) setProducts(data)
    setLoading(false)
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '', description: '', how_to_use: '', image_url: '',
      stock: 0, price_minorista: 0, price_mayorista: 0, price_peluquero: 0, price_revendedor: 0
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product: any) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      how_to_use: product.how_to_use || '',
      image_url: product.image_url || '',
      stock: product.stock || 0,
      price_minorista: product.price_minorista || 0,
      price_mayorista: product.price_mayorista || 0,
      price_peluquero: product.price_peluquero || 0,
      price_revendedor: product.price_revendedor || 0
    })
    setIsModalOpen(true)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingProduct) {
      // Update
      const { error } = await supabase.from('products').update(formData).eq('id', editingProduct.id)
      if (error) alert('Error: ' + error.message)
    } else {
      // Insert
      const { error } = await supabase.from('products').insert([formData])
      if (error) alert('Error: ' + error.message)
    }
    
    setIsModalOpen(false)
    loadProducts()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8" /> Catálogo
          </h1>
          <p className="text-gray-500 mt-1">{products.length} productos registrados</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-800"
        >
          <Plus className="h-5 w-5" /> Nuevo Producto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-black focus:border-black outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-semibold w-12"></th>
                <th className="p-4 font-semibold">Producto</th>
                <th className="p-4 font-semibold">Minorista</th>
                <th className="p-4 font-semibold">Mayorista</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900 line-clamp-2">{product.name}</div>
                  </td>
                  <td className="p-4 text-sm">${product.price_minorista?.toLocaleString('es-AR')}</td>
                  <td className="p-4 text-sm">${product.price_mayorista?.toLocaleString('es-AR')}</td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${product.stock <= 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2">
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={saveProduct} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                <input type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" placeholder="https://ejemplo.com/foto.jpg" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Minorista *</label>
                  <input required type="number" step="0.01" value={formData.price_minorista} onChange={e => setFormData({...formData, price_minorista: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mayorista *</label>
                  <input required type="number" step="0.01" value={formData.price_mayorista} onChange={e => setFormData({...formData, price_mayorista: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">P. Peluquero</label>
                  <input type="number" step="0.01" value={formData.price_peluquero} onChange={e => setFormData({...formData, price_peluquero: Number(e.target.value)})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" placeholder="Fórmula pensada para acompañar tu rutina..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Uso</label>
                <textarea rows={3} value={formData.how_to_use} onChange={e => setFormData({...formData, how_to_use: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:border-black outline-none" placeholder="Aplicar sobre cabello húmedo..."></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
