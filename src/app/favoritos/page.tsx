'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useFavorites } from '@/context/FavoritesContext'
import { useCart } from '@/context/CartContext'
import { supabase } from '@/lib/supabase/client'
import { 
  Heart, 
  Trash2, 
  ShoppingBag, 
  Bell, 
  Tag, 
  PackageSearch, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { formatPrice, getRolePrice, getAvailableStock, type Product, type UserRole, normalizeRole } from '@/lib/catalog'

export default function FavoritosPage() {
  const { favorites, removeFromFavorites, updateNotificationSettings, isLoading: favsLoading } = useFavorites()
  const { addToCart } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [userRole, setUserRole] = useState<UserRole>('minorista')
  const [loading, setLoading] = useState(true)

  // Cargar rol y productos favoritos
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (profile) setUserRole(normalizeRole(profile.role))
        }

        if (favorites.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }

        const ids = favorites.map(f => f.productId)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('id', ids)

        if (data && !error) {
          setProducts(data as Product[])
        }
      } catch (e) {
        console.error('Error al cargar productos favoritos:', e)
      } finally {
        setLoading(false)
      }
    }

    if (!favsLoading) {
      loadData()
    }
  }, [favorites, favsLoading])

  const handleAddToCart = (product: Product) => {
    const price = getRolePrice(product, userRole)
    const stock = getAvailableStock(product)
    if (stock <= 0) return

    addToCart({
      id: product.id,
      name: product.name,
      price,
      quantity: 1,
      image_url: product.image_url,
      stock,
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col text-gray-900 antialiased">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-100 text-red-600">
                <Heart size={22} fill="currentColor" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#002f5b]">
                Mis Favoritos
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Guarda tus productos preferidos y configura alertas para enterarte al instante de ofertas o reposición de stock.
            </p>
          </div>

          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#002f5b] hover:text-brand-primary transition-colors"
          >
            Explorar más productos <ArrowRight size={14} />
          </Link>
        </div>

        {/* Loading */}
        {(loading || favsLoading) && (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400 mt-3 uppercase tracking-wider font-semibold">Cargando tus favoritos...</p>
          </div>
        )}

        {/* Estado Vacío */}
        {!loading && !favsLoading && products.length === 0 && (
          <div className="bg-white rounded-3xl p-10 sm:p-16 text-center max-w-lg mx-auto border border-gray-100 shadow-sm mt-6">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-400 flex items-center justify-center mx-auto mb-5">
              <Heart size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tu lista de favoritos está vacía</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Explora nuestro catálogo capilar y toca el corazón en cualquier producto para guardarlo aquí y recibir alertas de stock y descuentos.
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-black text-white px-7 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
            >
              <Sparkles size={16} /> Ver Catálogo de Productos
            </Link>
          </div>
        )}

        {/* Grilla de Favoritos */}
        {!loading && !favsLoading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const favConfig = favorites.find(f => f.productId === product.id)
              const price = getRolePrice(product, userRole)
              const stock = getAvailableStock(product)
              const inStock = stock > 0

              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top: Foto y datos */}
                    <div className="flex gap-4">
                      <Link 
                        href={`/producto/${product.id}`}
                        className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-100 flex-none p-2 flex items-center justify-center overflow-hidden group"
                      >
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <PackageSearch size={24} className="text-gray-400" />
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {product.category || 'Capilar'}
                        </span>
                        <Link href={`/producto/${product.id}`}>
                          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 hover:text-[#002f5b] transition-colors mt-0.5">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-base font-extrabold text-[#c1272d] mt-2">
                          {formatPrice(price)}
                        </p>

                        <div className="mt-1">
                          {inStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                              <Check size={12} /> {stock} disponibles
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                              Sin stock actualmente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alertas de Notificación configurables */}
                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5 bg-gray-50/70 p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                        <Bell size={13} className="text-[#002f5b]" /> Configurar Alertas de este producto:
                      </p>

                      <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-black">
                        <span className="flex items-center gap-2">
                          <Tag size={13} className="text-green-600" />
                          Avisarme si entra en oferta o baja de precio
                        </span>
                        <input
                          type="checkbox"
                          checked={favConfig?.notifySale ?? true}
                          onChange={(e) => updateNotificationSettings(product.id, { notifySale: e.target.checked })}
                          className="rounded border-gray-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer hover:text-black">
                        <span className="flex items-center gap-2">
                          <Bell size={13} className="text-blue-600" />
                          Avisarme de reposición o falta de stock
                        </span>
                        <input
                          type="checkbox"
                          checked={favConfig?.notifyStock ?? true}
                          onChange={(e) => updateNotificationSettings(product.id, { notifyStock: e.target.checked })}
                          className="rounded border-gray-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Acciones de pie */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={!inStock}
                      className="flex-1 bg-black text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                    >
                      <ShoppingBag size={14} />
                      {inStock ? 'Agregar al carrito' : 'Sin stock'}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromFavorites(product.id)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar de favoritos"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}
