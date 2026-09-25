'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Search, Edit3, Save, X, Package, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

export default function MobileStockPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [sortBy, setSortBy] = useState<'name' | 'stock'>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

  const loadProducts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/mobile'); return }

    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (data) setProducts(data)
    setLoading(false)
    setRefreshing(false)
  }, [router])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleRefresh = () => {
    setRefreshing(true)
    loadProducts()
  }

  const startEdit = (product: any) => {
    setEditingId(product.id)
    setEditValues({
      stock: product.stock,
      price_minorista: product.price_minorista,
      price_mayorista: product.price_mayorista,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({
        stock: Number(editValues.stock),
        price_minorista: Number(editValues.price_minorista),
        price_mayorista: Number(editValues.price_mayorista),
      })
      .eq('id', id)

    if (error) {
      alert('Error al guardar: ' + error.message)
      return
    }

    setProducts(products.map(p => p.id === id ? {
      ...p,
      stock: Number(editValues.stock),
      price_minorista: Number(editValues.price_minorista),
      price_mayorista: Number(editValues.price_mayorista),
    } : p))
    setEditingId(null)
  }

  const stockColor = (stock: number) => {
    if (stock <= 0) return 'text-red-600 bg-red-50'
    if (stock < 10) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const stockDot = (stock: number) => {
    if (stock <= 0) return 'bg-red-500'
    if (stock < 10) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  let filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search) ||
    p.internal_code?.toLowerCase().includes(search.toLowerCase())
  )

  if (filter === 'low') filtered = filtered.filter(p => p.stock > 0 && p.stock < 10)
  if (filter === 'out') filtered = filtered.filter(p => p.stock <= 0)

  filtered.sort((a, b) => {
    const valA = sortBy === 'name' ? (a.name || '') : a.stock
    const valB = sortBy === 'name' ? (b.name || '') : b.stock
    if (sortBy === 'name') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    return sortAsc ? valA - valB : valB - valA
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 pt-6 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6" /> Stock
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{products.length} productos</p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2.5 bg-gray-100 rounded-xl text-gray-600 active:bg-gray-200 ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: 'Todos' },
            { key: 'low' as const, label: '⚠️ Bajo' },
            { key: 'out' as const, label: '🔴 Sin stock' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === f.key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (sortBy === 'stock') {
                setSortAsc(!sortAsc)
              } else {
                setSortBy('stock')
                setSortAsc(true)
              }
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 flex items-center gap-1 ml-auto"
          >
            Stock {sortBy === 'stock' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No se encontraron productos
          </div>
        ) : (
          filtered.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              {editingId === product.id ? (
                /* Edit Mode */
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                    )}
                    <p className="font-semibold text-gray-900 text-sm flex-1 line-clamp-2">{product.name}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Stock</label>
                      <input
                        type="number"
                        value={editValues.stock}
                        onChange={e => setEditValues({ ...editValues, stock: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Minorista</label>
                      <input
                        type="number"
                        value={editValues.price_minorista}
                        onChange={e => setEditValues({ ...editValues, price_minorista: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Mayorista</label>
                      <input
                        type="number"
                        value={editValues.price_mayorista}
                        onChange={e => setEditValues({ ...editValues, price_mayorista: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(product.id)}
                      className="flex-1 bg-green-500 text-white font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5 active:bg-green-600"
                    >
                      <Save className="h-4 w-4" /> Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-100 text-gray-700 font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5 active:bg-gray-200"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">IMG</div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">${product.price_minorista?.toLocaleString('es-AR')}</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${stockDot(product.stock)}`} />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${stockColor(product.stock)}`}>
                          {product.stock} uds
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(product)}
                    className="p-2.5 bg-gray-100 rounded-xl text-gray-600 active:bg-gray-200 flex-shrink-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
